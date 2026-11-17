# tickets

Private Discord support tickets with category panels, exclusive staff claims,
and plain-text transcripts saved before a ticket channel is deleted.

## Setup

Use Node.js 22.13+ (24 recommended), then:

```sh
npm ci
cp .env.example .env
# Set DISCORD_TOKEN, CLIENT_ID and GUILD_ID
node --env-file=.env src/deploy.js
node --env-file=.env src/index.js
```

Enable **Message Content Intent** in the Discord Developer Portal. Invite the
bot with `bot` and `applications.commands` scopes. Grant Manage Channels, View
Channels, Send Messages, Read Message History and Attach Files. The host needs
filesystem access to DATABASE_PATH (default `./data/app.sqlite`). Use one process
per database. Guild commands are registered in GUILD_ID only; deploy per server.

## Use

1. Create a support role and a parent channel category.
2. Run `/ticket-config key:support parent:<category> staff:<role>` (Manage Server).
3. Run `/ticket-panel category:support` in a public text channel (Manage Server).
4. Members click **Open ticket**. Each person can have one active ticket per server.
5. Support staff use `/ticket-claim`; the first claim wins. The claimant or a server manager can use `/ticket-unclaim` to make it available again. Other staff cannot release someone else's claim; closing tickets cannot be reassigned.
6. The owner or staff use `/ticket-close`. A transcript is saved, then the channel
   is deleted. Failed deletion leaves a closing ticket that can be retried.
7. `/ticket-transcript id:<number>` returns the saved file privately to the owner
   or the ticket's staff role. `/ticket-history` shows your last ten tickets.

Repeat configuration with different keys for different ticket categories. Existing
tickets retain their original staff role. Manage Server can manage all tickets.
New channels deny everyone access and explicitly allow the owner, support role
and bot. Administrators always bypass Discord channel permissions. Keep support
roles narrow, and review permissions if changing a channel manually.

## Transcripts and recovery

Transcripts contain Discord IDs, timestamps, message text and attachment URLs.
Attachments themselves and embed bodies are not downloaded. Deleted messages
cannot be recovered. Transcripts include messages available at close time; they
are not a complete edit history. Collection refuses tickets over 5000 messages
rather than silently truncating them. Large transcripts may need a host-side
export when Discord's upload limit is exceeded.

The database contains private support conversations. Limit host and backup
access, tell members your retention policy, and stop the bot before maintenance.
Automated retention is planned for a later release. Never commit this database.
Use SQLite backup tooling or stop the process before copying all SQLite files.

Discord channel creation/deletion and SQLite commits are separate operations.
After a crash, reconcile `creating` or `closing` rows against actual channels
before editing the database or reopening tickets. If a channel was deleted
outside the bot, the operator must mark the corresponding ticket closed after
checking its identity. Run a single bot instance; this is not a distributed worker.

## Checks

```sh
npm test
npm run check
npm audit --omit=dev
```

Tests cover ticket uniqueness, exclusive claims, close persistence, guild
isolation, category snapshots, transcript ordering and pagination limits.
Live Discord channel permissions and gateway behavior require a test guild.

## Updating

Run `git pull --ff-only` and `npm ci`, then re-register the guild commands with
`node --env-file=.env src/deploy.js` before restarting the bot.
See [CHANGELOG.md](CHANGELOG.md) for the latest behavior changes. This update
does not require a database migration.
