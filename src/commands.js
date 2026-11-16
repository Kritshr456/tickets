import { SlashCommandBuilder, PermissionFlagsBits as P, ChannelType } from 'discord.js';
const command=(name,description,staff=false)=>{
  const c=new SlashCommandBuilder().setName(name).setDescription(description).setDMPermission(false);
  if(staff)c.setDefaultMemberPermissions(P.ManageGuild);
  return c;
};
export const commands=[
  command('ticket-config','Create or update a ticket category',true)
    .addStringOption(o=>o.setName('key').setDescription('Lowercase category key').setMaxLength(24).setRequired(true))
    .addChannelOption(o=>o.setName('parent').setDescription('Parent category').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    .addRoleOption(o=>o.setName('staff').setDescription('Support staff role').setRequired(true)),
  command('ticket-panel','Post a ticket panel here',true)
    .addStringOption(o=>o.setName('category').setDescription('Configured category key').setRequired(true)),
  command('ticket-claim','Claim the current ticket'),
  command('ticket-close','Archive and close the current ticket'),
  command('ticket-transcript','Download a saved transcript')
    .addIntegerOption(o=>o.setName('id').setDescription('Ticket ID').setMinValue(1).setRequired(true)),
  command('ticket-history','View your ten most recent tickets'),
];
