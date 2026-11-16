import { TicketError } from './store.js';
export function renderTranscript(ticket,messages){
  const rows=[`Ticket #${ticket.id} | guild ${ticket.guild} | owner ${ticket.owner}`,`Category: ${ticket.category} | claimed: ${ticket.claimed || 'unclaimed'}`,''];
  for(const m of [...messages].sort((a,b)=>a.createdTimestamp-b.createdTimestamp || a.id.localeCompare(b.id))){
    rows.push(`[${new Date(m.createdTimestamp).toISOString()}] ${m.author.id}: ${m.content || ''}`);
    for(const a of m.attachments.values()) rows.push(`Attachment: ${a.url}`);
    if(m.embeds.length) rows.push(`[${m.embeds.length} embed(s); embedded content not archived]`);
  }
  return rows.join('\n');
}
export async function collectMessages(channel,limit=5000){
  const result=[];let before;
  while(true){
    const page=await channel.messages.fetch({limit:100,...(before?{before}:{})});
    if(!page.size) return result;
    result.push(...page.values());
    if(result.length>limit) throw new TicketError('Transcript exceeds 5000 messages. Export manually before closing.');
    before=page.last().id;
    if(page.size<100)return result;
  }
}
