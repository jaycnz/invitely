const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function openButton(inviteId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`invite_open|${inviteId}`)
      .setLabel('Open Letter')
      .setEmoji('📩')
      .setStyle(ButtonStyle.Primary),
  );
}

function rsvpButtons(inviteId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`invite_confirm|${inviteId}`)
      .setLabel("I'm in")
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`invite_decline|${inviteId}`)
      .setLabel("Can't make it")
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),
  );
}

module.exports = { openButton, rsvpButtons };