const { EmbedBuilder } = require('discord.js');

function countConfirmed(invite) {
  return Object.values(invite.invitees).filter((i) => i.status === 'confirmed').length;
}

// The sealed letter. No details yet, just an envelope
function teaserEmbed(hostTag) {
  return new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle('📩 You\'ve received a letter')
    .setDescription(`**${hostTag}** has sent you an invite to play together.\n\nClick **Open Letter** to see the details.`)
    .setFooter({ text: "They'll know the moment you open this." });
}

// Shown after the letter is opened, with RSVP buttons attached
function revealedEmbed(invite) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎮 ${invite.game}`)
    .setDescription(`**${invite.hostTag}** invites you to play **${invite.game}**.`)
    .addFields(
      { name: 'When', value: `<t:${invite.timeUnix}:F> (<t:${invite.timeUnix}:R>)` },
      { name: 'Slots', value: `${countConfirmed(invite)}/${invite.slots}` },
    )
    .setFooter({ text: 'Confirm if you can make it!' });
}

// The live "lobby" posted in-channel, edited as people respond
function lobbyEmbed(invite) {
  const entries = Object.entries(invite.invitees);
  const confirmed = entries.filter(([, v]) => v.status === 'confirmed');
  const pending = entries.filter(([, v]) => v.status === 'sent' || v.status === 'opened');
  const declined = entries.filter(([, v]) => v.status === 'declined');

  const embed = new EmbedBuilder()
    .setColor(confirmed.length >= invite.slots ? 0x57f287 : 0x5865f2)
    .setTitle(`🎮 ${invite.game} — Lobby`)
    .addFields(
      { name: 'Host', value: `<@${invite.hostId}>`, inline: true },
      { name: 'When', value: `<t:${invite.timeUnix}:F>`, inline: true },
      { name: 'Slots', value: `${confirmed.length}/${invite.slots}`, inline: true },
      { name: '✅ Confirmed', value: confirmed.length ? confirmed.map(([id]) => `<@${id}>`).join('\n') : '_none yet_' },
      {
        name: '📨 Pending',
        value: pending.length
          ? pending.map(([id, v]) => `<@${id}>${v.status === 'opened' ? ' _(opened)_' : ''}`).join('\n')
          : '_none_',
      },
    );

  if (declined.length) {
    embed.addFields({ name: '❌ Declined', value: declined.map(([id]) => `<@${id}>`).join('\n') });
  }
  if (confirmed.length >= invite.slots) {
    embed.setDescription('**Lobby full!**');
  }
  return embed;
}

function cancelledLobbyEmbed(invite) {
  return new EmbedBuilder()
    .setColor(0x99a1ab)
    .setTitle(`🎮 ${invite.game} — Lobby (Cancelled)`)
    .setDescription(`This invite was cancelled by <@${invite.hostId}>.`);
}

function cancelledLetterEmbed(invite) {
  return new EmbedBuilder()
    .setColor(0x99a1ab)
    .setTitle(`❌ ${invite.game} — Invite Cancelled`)
    .setDescription(`**${invite.hostTag}** cancelled this invite.`);
}

function inviteListEmbed(invites) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📋 Your active invites')
    .setDescription(
      invites.length
        ? invites
            .map((inv) => `**${inv.game}** — <t:${inv.timeUnix}:f> — ${countConfirmed(inv)}/${inv.slots} confirmed`)
            .join('\n')
        : '_none_',
    );
}

module.exports = {
  teaserEmbed,
  revealedEmbed,
  lobbyEmbed,
  countConfirmed,
  cancelledLobbyEmbed,
  cancelledLetterEmbed,
  inviteListEmbed,
};

module.exports = {
  teaserEmbed,
  revealedEmbed,
  lobbyEmbed,
  countConfirmed,
  cancelledLobbyEmbed,
  cancelledLetterEmbed,
  inviteListEmbed,
};