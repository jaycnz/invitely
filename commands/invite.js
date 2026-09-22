const { SlashCommandBuilder } = require('discord.js');
const { randomUUID } = require('crypto');
const { createInvite, getInvite, updateInvite, listInvites } = require('../utils/inviteStore');
const {
  teaserEmbed,
  lobbyEmbed,
  cancelledLobbyEmbed,
  cancelledLetterEmbed,
  inviteListEmbed,
  countConfirmed,
} = require('../utils/embeds');
const { openButton } = require('../utils/components');

function parseTime(input) {
  let date = new Date(input);
  if (isNaN(date.getTime())) date = new Date(input.replace(' ', 'T'));
  return isNaN(date.getTime()) ? null : date;
}

function parseUserIds(input) {
  const ids = new Set();
  const mentionRegex = /<@!?(\d+)>/g;
  let m;
  while ((m = mentionRegex.exec(input))) ids.add(m[1]);
  input.split(/[\s,]+/).forEach((tok) => {
    if (/^\d{15,20}$/.test(tok)) ids.add(tok);
  });
  return [...ids];
}

function activeHostedInvites(interaction) {
  return listInvites(
    (inv) => inv.hostId === interaction.user.id && inv.guildId === interaction.guildId && !inv.cancelled,
  );
}

async function handleCreate(interaction) {
  const game = interaction.options.getString('game');
  const timeInput = interaction.options.getString('time');
  const slots = interaction.options.getInteger('slots');
  const playersInput = interaction.options.getString('players');

  const date = parseTime(timeInput);
  if (!date) {
    return interaction.reply({
      content: `⚠️ Couldn't parse "${timeInput}". Try "2026-09-20 19:00" or an ISO timestamp with offset like "2026-09-20T19:00:00+13:00".`,
      ephemeral: true,
    });
  }

  const userIds = parseUserIds(playersInput).filter((id) => id !== interaction.user.id);
  if (userIds.length === 0) {
    return interaction.reply({
      content: '⚠️ No valid players found — mention them (@user) or give their user IDs.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const invite = {
    id: randomUUID(),
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    hostId: interaction.user.id,
    hostTag: interaction.user.username,
    game,
    timeUnix: Math.floor(date.getTime() / 1000),
    slots,
    lobbyMessageId: null,
    cancelled: false,
    invitees: Object.fromEntries(
      userIds.map((id) => [id, { status: 'sent', dmMessageId: null, openedAt: null, respondedAt: null }]),
    ),
  };
  createInvite(invite);

  const lobbyMsg = await interaction.channel.send({ embeds: [lobbyEmbed(invite)] });
  invite.lobbyMessageId = lobbyMsg.id;

  const failed = [];
  for (const userId of userIds) {
    try {
      const user = await interaction.client.users.fetch(userId);
      const dm = await user.send({
        embeds: [teaserEmbed(interaction.user.username)],
        components: [openButton(invite.id)],
      });
      invite.invitees[userId].dmMessageId = dm.id;
    } catch (err) {
      failed.push(userId);
    }
  }
  createInvite(invite);

  let summary = `✅ Sent ${userIds.length - failed.length} letter(s) for **${game}**.`;
  if (failed.length) {
    summary += `\n⚠️ Couldn't DM: ${failed.map((id) => `<@${id}>`).join(', ')} (their DMs may be closed).`;
  }
  await interaction.editReply(summary);
}

async function handleList(interaction) {
  const invites = activeHostedInvites(interaction);
  return interaction.reply({ embeds: [inviteListEmbed(invites)], ephemeral: true });
}

async function handleCancel(interaction) {
  const id = interaction.options.getString('id');
  const invite = getInvite(id);

  if (!invite || invite.cancelled) {
    return interaction.reply({
      content: 'Could not find an active invite with that ID — it may already be cancelled.',
      ephemeral: true,
    });
  }
  if (invite.hostId !== interaction.user.id) {
    return interaction.reply({ content: "You can only cancel invites you're hosting.", ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  updateInvite(id, (inv) => {
    inv.cancelled = true;
    inv.cancelledAt = Date.now();
  });
  const fresh = getInvite(id);

  try {
    const channel = await interaction.client.channels.fetch(invite.channelId);
    const msg = await channel.messages.fetch(invite.lobbyMessageId);
    await msg.edit({ embeds: [cancelledLobbyEmbed(fresh)] });
  } catch (err) {
    console.error('Could not update lobby message on cancel:', err);
  }

  for (const [userId, entry] of Object.entries(invite.invitees)) {
    if (!entry.dmMessageId) continue;
    try {
      const user = await interaction.client.users.fetch(userId);
      const dmChannel = user.dmChannel ?? (await user.createDM());
      const dm = await dmChannel.messages.fetch(entry.dmMessageId);
      await dm.edit({ embeds: [cancelledLetterEmbed(fresh)], components: [] });
    } catch (err) {
      // Couldn't reach that user's DM — skip silently, not critical
    }
  }

  await interaction.editReply(`❌ Cancelled your invite for **${invite.game}**.`);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invitely')
    .setDescription('Send personal game invites')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Send out invite letters for a game session')
        .addStringOption((o) => o.setName('game').setDescription('What are you playing?').setRequired(true))
        .addStringOption((o) =>
          o
            .setName('time')
            .setDescription('When (e.g. "2026-09-20 19:00" or ISO with offset "2026-09-20T19:00:00+13:00")')
            .setRequired(true),
        )
        .addIntegerOption((o) =>
          o.setName('slots').setDescription('How many players you need').setRequired(true).setMinValue(1),
        )
        .addStringOption((o) =>
          o.setName('players').setDescription('Mention the players to invite (@user @user ...)').setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('Show your active invites in this server'))
    .addSubcommand((sub) =>
      sub
        .setName('cancel')
        .setDescription('Cancel an invite you are hosting')
        .addStringOption((o) =>
          o.setName('id').setDescription('Which invite to cancel').setRequired(true).setAutocomplete(true),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') return handleCreate(interaction);
    if (sub === 'list') return handleList(interaction);
    if (sub === 'cancel') return handleCancel(interaction);
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = activeHostedInvites(interaction)
      .map((inv) => ({
        name: `${inv.game} — ${new Date(inv.timeUnix * 1000).toLocaleString()} (${countConfirmed(inv)}/${inv.slots})`.slice(0, 100),
        value: inv.id,
      }))
      .filter((c) => c.name.toLowerCase().includes(focused))
      .slice(0, 25);
    await interaction.respond(choices);
  },
};