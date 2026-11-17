# Changelog

## 1.1.0

- Add `/ticket-unclaim` for the current claimant or a server manager.
- Allow another staff member to claim the released ticket.
- Reject releases for unclaimed, closing, closed or cross-guild tickets.
- Expand `npm run check` to syntax-check source, browser code, tests and scripts.

### Upgrade

Re-register guild commands with `node --env-file=.env src/deploy.js`, then restart the bot. Existing SQLite data is preserved.
