import test from 'node:test';
import assert from 'node:assert/strict';
import { closeTicket } from '../src/close-ticket.js';
import { openStore } from '../src/store.js';

function fixture(t) {
  const store = openStore();
  t.after(() => store.close());
  store.config('guild', 'support', 'parent', 'staff');
  const id = store.reserve('guild', 'owner', 'support');
  store.activate(id, 'channel');
  const ticket = store.get('guild', id);
  const interaction = {
    guildId: 'guild',
    user: { id: 'owner' },
    editReply: async () => {},
    channel: { messages: { fetch: async () => new Map() }, delete: async () => {} },
  };
  return { store, ticket, interaction };
}

test('a failed private reply does not prevent closing a ticket', async t => {
  const { store, ticket, interaction } = fixture(t);
  interaction.editReply = async () => { throw new Error('Reply expired'); };
  interaction.channel.delete = async () => {
    const saved = store.get('guild', ticket.id);
    assert.equal(saved.status, 'closing');
    assert.match(saved.transcript, /Category: support/);
  };

  await closeTicket(store, interaction, ticket);

  assert.equal(store.get('guild', ticket.id).status, 'closed');
  assert.ok(store.reserve('guild', 'owner', 'support'));
});

test('a failed channel deletion preserves the transcript and allows retry', async t => {
  const { store, ticket, interaction } = fixture(t);
  interaction.channel.delete = async () => { throw new Error('Missing permissions'); };

  await assert.rejects(closeTicket(store, interaction, ticket), /Missing permissions/);
  const saved = store.get('guild', ticket.id);
  assert.equal(saved.status, 'closing');
  assert.match(saved.transcript, /Category: support/);

  interaction.channel.delete = async () => {};
  await closeTicket(store, interaction, saved);
  assert.equal(store.get('guild', ticket.id).status, 'closed');
});

test('transcript collection failure leaves the channel and ticket open', async t => {
  const { store, ticket, interaction } = fixture(t);
  interaction.channel.messages.fetch = async () => { throw new Error('History unavailable'); };
  interaction.channel.delete = async () => assert.fail('Must preserve the channel');

  await assert.rejects(closeTicket(store, interaction, ticket), /History unavailable/);
  const saved = store.get('guild', ticket.id);
  assert.equal(saved.status, 'open');
  assert.equal(saved.transcript, null);
});

test('successful closure saves the transcript before notifying and deleting', async t => {
  const { store, ticket, interaction } = fixture(t);
  const operations = [];
  interaction.editReply = async () => {
    assert.equal(store.get('guild', ticket.id).status, 'closing');
    assert.ok(store.get('guild', ticket.id).transcript);
    operations.push('reply');
  };
  interaction.channel.delete = async () => operations.push('delete');

  await closeTicket(store, interaction, ticket);

  assert.deepEqual(operations, ['reply', 'delete']);
  assert.equal(store.get('guild', ticket.id).status, 'closed');
});

test('a slow private reply does not delay deleting the channel or freeing the owner slot', async t => {
  const { store, ticket, interaction } = fixture(t);
  let release, deleted = false;
  interaction.editReply = () => new Promise(resolve => { release = resolve; });
  interaction.channel.delete = async () => { deleted = true; };
  const pending = closeTicket(store, interaction, ticket);
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(deleted, true);
    assert.equal(store.get('guild', ticket.id).status, 'closed');
    assert.ok(store.reserve('guild', 'owner', 'support'));
  } finally { release(); await pending; }
});
