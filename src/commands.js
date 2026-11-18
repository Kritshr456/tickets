import { SlashCommandBuilder, PermissionFlagsBits as P, ChannelType } from 'discord.js';
const command=(name,description,staff=false)=>{
  const c=new SlashCommandBuilder().setName(name).setDescription(description).setDMPermission(false);
  if(staff)c.setDefaultMemberPermissions(P.ManageGuild);
  return c;
};
export const commands=[
  command('ticket-toggle','Pause or resume new tickets in a category',true).addStringOption(o=>o.setName('category').setDescription('Configured category key').setRequired(true)).addBooleanOption(o=>o.setName('enabled').setDescription('Allow new tickets').setRequired(true)),
  command('ticket-config','Create or update a ticket category',true)
    .addStringOption(o=>o.setName('key').setDescription('Lowercase category key').setMaxLength(24).setRequired(true))
    .addChannelOption(o=>o.setName('parent').setDescription('Parent category').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    .addRoleOption(o=>o.setName('staff').setDescription('Support staff role').setRequired(true)),
  command('ticket-panel','Post a ticket panel here',true)
    .addStringOption(o=>o.setName('category').setDescription('Configured category key').setRequired(true)),
  command('ticket-claim','Claim the current ticket'),
  command('ticket-unclaim','Release the current ticket claim'),
  command('ticket-close','Archive and close the current ticket'),
  command('ticket-transcript','Download a saved transcript')
    .addIntegerOption(o=>o.setName('id').setDescription('Ticket ID').setMinValue(1).setRequired(true)),
  command('ticket-list','List tickets assigned to your staff roles').addStringOption(o=>o.setName('status').setDescription('Ticket state; defaults to active').addChoices(...['active','creating','open','closing','closed'].map(value=>({name:value,value})))).addBooleanOption(o=>o.setName('mine').setDescription('Only tickets claimed by you')).addIntegerOption(o=>o.setName('page').setDescription('Page, oldest first').setMinValue(1).setMaxValue(100000)),
  command('ticket-history','View your ten most recent tickets'),
];
