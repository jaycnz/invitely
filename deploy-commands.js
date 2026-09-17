require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} command(s)...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('Commands deployed successfully.');
  } catch (err) {
    console.error(err);
  }
})();