import { EmbedBuilder, PermissionFlagsBits as P } from 'discord.js';
import { TicketError } from './store.js';

export async function handleTicketList(i, member, store) {
  if(i.commandName!=='ticket-list')return false;
  const result=store.list({guild:i.guildId,roles:[...member.roles.cache.keys()],manager:member.permissions.has(P.ManageGuild),
    status:i.options.getString('status')||'active',mine:i.options.getBoolean('mine')?i.user.id:null,page:i.options.getInteger('page')||1});
  const embed=new EmbedBuilder().setTitle('Staff tickets').setColor(0x345b83)
    .setDescription(result.rows.length?`Filter: ${result.status}`:'No accessible tickets on this page.')
    .setFooter({text:`Page ${result.page} of ${Math.max(1,Math.ceil(result.total/5))} • ${result.total} tickets`});
  for(const t of result.rows)embed.addFields({name:`#${t.id} ${t.category} • ${t.status}`,value:
    `Owner: <@${t.owner}>\n${t.channel?`Channel: <#${t.channel}>`:'Channel creation pending'}\n${t.claimed?`Claimed by: <@${t.claimed}>`:'Unclaimed'}\n${t.created} UTC`});
  await i.editReply({embeds:[embed],allowedMentions:{parse:[]}});
  return true;
}

export async function handleCategoryToggle(i, member, store) {
  if(i.commandName!=='ticket-toggle')return false;
  if(!member.permissions.has(P.ManageGuild))throw new TicketError('Manage Server is required.');
  const enabled=i.options.getBoolean('enabled',true);
  store.toggleCategory(i.guildId,i.options.getString('category',true),enabled);
  await i.editReply(enabled?'New tickets resumed for this category.':'New tickets paused. Existing tickets remain available.');
  return true;
}
