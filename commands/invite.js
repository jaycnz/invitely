const { SlashCommandBuilder } = require('discord.js');
const { randomUUID } = require('crypto');
const { createInvite } = require('../utils/inviteStore');
const { teaserEmbed, lobbyEmbed } = require('../utils/embeds');
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
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
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub !== 'create') return;

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
      invitees: Object.fromEntries(
        userIds.map((id) => [id, { status: 'sent', dmMessageId: null, openedAt: null, respondedAt: null }]),
      ),
    };
    createInvite(invite);

    // Post the live lobby in the channel the command was run in
    const lobbyMsg = await interaction.channel.send({ embeds: [lobbyEmbed(invite)] });
    invite.lobbyMessageId = lobbyMsg.id;

    // DM each invitee a sealed letter
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
    createInvite(invite); // persist dmMessageIds / lobbyMessageId

    let summary = `✅ Sent ${userIds.length - failed.length} letter(s) for **${game}**.`;
    if (failed.length) {
      summary += `\n⚠️ Couldn't DM: ${failed.map((id) => `<@${id}>`).join(', ')} (their DMs may be closed).`;
    }
    await interaction.editReply(summary);
  },
};