import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';
for (const name of ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}
await new REST().setToken(process.env.DISCORD_TOKEN).put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands.map(command => command.toJSON()) },
);
console.log('Guild commands registered.');
