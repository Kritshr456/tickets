import { collectMessages, renderTranscript } from './transcript.js';

export async function closeTicket(store, interaction, ticket) {
  const messages = await collectMessages(interaction.channel);
  const transcript = renderTranscript(ticket, messages);
  store.snapshot(interaction.guildId, ticket.id, transcript);

  const notification = (async () => {
    try {
      await interaction.editReply(
        `Transcript saved. Closing ticket #${ticket.id}. Retrieve it using /ticket-transcript id:${ticket.id} in another channel.`,
      );
    } catch { console.warn('Could not send the private ticket-close reply.'); }
  })();

  let deletionError;
  try {
    await interaction.channel.delete(`Ticket ${ticket.id} closed by ${interaction.user.id}`);
    store.finish(interaction.guildId, ticket.id);
  } catch (error) { deletionError = error; }
  // Persist closure immediately; wait for the best-effort reply separately.
  await notification;
  if (deletionError) throw deletionError;
}
