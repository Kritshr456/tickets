# Changelog

## 1.2.2

- Delete ticket channels and persist closure without waiting for slow private replies, while preserving transcript-first ordering and deletion retries.

## 1.2.1

- Complete ticket closure even when Discord rejects the private status reply after the transcript is saved.

## 1.2.0

- Pause/resume new category tickets without affecting ongoing conversations or existing panels.
- Re-register commands after upgrading. Existing categories and tickets are preserved during the automatic upgrade.

- Add a private staff ticket queue with role-aware access, status/claim filters and pagination.

## 1.1.0

- Add `/ticket-unclaim` for the current claimant or a server manager.
- Allow another staff member to claim the released ticket.
- Reject releases for unclaimed, closing, closed or cross-guild tickets.
- Expand `npm run check` to syntax-check source, browser code, tests and scripts.

### Upgrade

Re-register guild commands with `node --env-file=.env src/deploy.js`, then restart the bot. Existing SQLite data is preserved.
