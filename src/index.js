import { Client, GatewayIntentBits as I, Events, PermissionFlagsBits as P, ChannelType, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { openStore, TicketError } from './store.js';
import { collectMessages, renderTranscript } from './transcript.js';
if(!process.env.DISCORD_TOKEN)throw Error('Missing DISCORD_TOKEN');
const store=openStore(process.env.DATABASE_PATH || './data/app.sqlite');
const client=new Client({intents:[I.Guilds,I.GuildMessages,I.MessageContent],allowedMentions:{parse:[]}});
const closing=new Set();
const isStaff=(member,ticket)=>member.permissions.has(P.ManageGuild)||member.roles.cache.has(ticket.staff);
function requireManager(member){if(!member.permissions.has(P.ManageGuild))throw new TicketError('Manage Server is required.');}
client.on(Events.InteractionCreate,async i=>{
  if(!i.inGuild() || !(i.isChatInputCommand() || (i.isButton()&&i.customId.startsWith('ticket:'))))return;
  try{
    await i.deferReply({flags:MessageFlags.Ephemeral});
    const member=await i.guild.members.fetch(i.user.id);
    if(i.isButton()){
      const key=i.customId.slice(7);
      const cfg=store.category(i.guildId,key);
      if(!cfg)throw new TicketError('This panel is no longer configured.');
      const role=await i.guild.roles.fetch(cfg.staff);
      const parent=await i.guild.channels.fetch(cfg.parent);
      if(!role || role.id===i.guildId || parent?.type!==ChannelType.GuildCategory)throw new TicketError('The configured staff role or parent category no longer exists.');
      const bot=await i.guild.members.fetchMe();
      if(!bot.permissions.has(P.ManageChannels))throw new TicketError('The bot needs Manage Channels.');
      const id=store.reserve(i.guildId,i.user.id,key);
      let channel;
      try{
        const access=[P.ViewChannel,P.SendMessages,P.ReadMessageHistory,P.AttachFiles];
        channel=await i.guild.channels.create({name:`ticket-${id}`,type:ChannelType.GuildText,parent:parent.id,
          topic:`Support ticket #${id}`,permissionOverwrites:[
            {id:i.guildId,deny:[P.ViewChannel]},
            {id:cfg.staff,allow:access}, {id:i.user.id,allow:access},
            {id:bot.id,allow:[...access,P.ManageChannels]},
          ]});
        store.activate(id,channel.id);
      }catch(error){if(!channel)store.abandon(id);throw error;}
      await i.editReply(`Ticket #${id}: <#${channel.id}>`);
      await channel.send(`Ticket #${id}. Use /ticket-claim to claim or /ticket-close to archive and close. Transcripts are retained for the ticket owner and support staff.`);
      return;
    }
    if(i.commandName==='ticket-config'){
      requireManager(member);
      const role=i.options.getRole('staff',true);
      if(role.id===i.guildId || role.managed)throw new TicketError('Choose a regular staff role, not everyone or an integration role.');
      store.config(i.guildId,i.options.getString('key',true),i.options.getChannel('parent',true).id,role.id);
      return await i.editReply('Ticket category saved. Existing tickets keep their original staff role.');
    }
    if(i.commandName==='ticket-panel'){
      requireManager(member);
      const key=i.options.getString('category',true);
      if(!store.category(i.guildId,key))throw new TicketError('Configure this category first.');
      if(i.channel?.type!==ChannelType.GuildText)throw new TicketError('Post panels in a server text channel.');
      await i.channel.send({content:`Open a ${key} support ticket. One active ticket per person.`,components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`ticket:${key}`).setLabel('Open ticket').setStyle(ButtonStyle.Primary))]});
      return await i.editReply('Panel posted.');
    }
    if(i.commandName==='ticket-history')return await i.editReply(store.history(i.guildId,i.user.id).map(t=>`#${t.id} • ${t.category} • ${t.status} • ${t.created} UTC`).join('\n')||'No tickets yet.');
    if(i.commandName==='ticket-transcript'){
      const t=store.get(i.guildId,i.options.getInteger('id',true));
      if(!t || !(t.owner===i.user.id || isStaff(member,t)))throw new TicketError('Ticket not found or access denied.');
      if(!t.transcript)throw new TicketError('No saved transcript yet.');
      const buffer=Buffer.from(t.transcript,'utf8');
      if(buffer.length>i.attachmentSizeLimit)throw new TicketError('Transcript exceeds this server’s attachment limit. Ask the host operator to export it securely.');
      return await i.editReply({files:[new AttachmentBuilder(buffer,{name:`ticket-${t.id}.txt`})]});
    }
    const ticket=store.byChannel(i.guildId,i.channelId);
    if(!ticket)throw new TicketError('This is not a tracked ticket channel.');
    if(i.commandName==='ticket-claim'){
      if(!isStaff(member,ticket))throw new TicketError('Only support staff can claim tickets.');
      store.claim(i.guildId,ticket.id,i.user.id);
      return await i.editReply(`You claimed ticket #${ticket.id}.`);
    }
    if(i.commandName==='ticket-close'){
      if(!isStaff(member,ticket)&&ticket.owner!==i.user.id)throw new TicketError('Only the owner or support staff can close this ticket.');
      if(closing.has(ticket.id))throw new TicketError('This ticket is already being closed.');
      closing.add(ticket.id);
      try{
        const messages=await collectMessages(i.channel);
        const transcript=renderTranscript(ticket,messages);
        store.snapshot(i.guildId,ticket.id,transcript);
        await i.editReply(`Transcript saved. Closing ticket #${ticket.id}. Retrieve it using /ticket-transcript id:${ticket.id} in another channel.`);
        await i.channel.delete(`Ticket ${ticket.id} closed by ${i.user.id}`);
        store.finish(i.guildId,ticket.id);
      }finally{closing.delete(ticket.id);}
    }
  }catch(error){
    if(!(error instanceof TicketError))console.error('Ticket operation failed',{code:error.code??'unknown'});
    const content=error instanceof TicketError?error.message:'The operation failed. Check bot permissions. If closing failed, the saved transcript is retained and closing can be retried.';
    try{if(i.deferred||i.replied)await i.editReply(content);else await i.reply({content,flags:MessageFlags.Ephemeral});}catch{ /* Channel may already be deleted. */ }
  }
});
client.once(Events.ClientReady,()=>console.log('Ticket bot ready.'));
client.on(Events.Error,()=>console.error('Discord client error.'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{client.destroy();store.close();});
await client.login(process.env.DISCORD_TOKEN);
