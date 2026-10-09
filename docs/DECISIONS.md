# Engineering decisions

## Stack and why
- **NestJS + TypeScript API, Next.js + React frontend, PostgreSQL.** One language end to end; Nest guards and validation pipes make deny-by-default authorization simple to enforce. PostgreSQL provides the row locks and constraints the capacity rule needs.
- **Plain SQL with the `pg` driver instead of Prisma.** I planned on Prisma, but its engine binaries could not be downloaded in the build environment, so nothing built on it could be run or tested. For this app the cost is small: the important queries (`SELECT ... FOR UPDATE`, counts, filters) are clearer as SQL, and every query is parameterized. Migrations are ordered `.sql` files applied by a small runner (`schema_migrations` table, advisory lock, one transaction per file).
- **Modular monolith in an npm-workspaces monorepo** (`apps/api`, `apps/web`). Three locations and about 15 staff do not need services.

## Preventing over-registration
Registering and cancelling both start a transaction and lock the **workshop row** (`SELECT ... FOR UPDATE`). Capacity is checked against the active count read *after* the lock is held, so concurrent requests for one workshop run one after another and the last seat can only be given once. Cancellation takes the same lock (always workshop first, then registration, so no deadlocks), and so does editing a workshop, which refuses to lower capacity below the active count. A partial unique index also stops the same email holding two active seats in a workshop. The test suite fires 40 parallel requests at 5 seats and checks exactly 5 succeed. With the lock temporarily removed the test failed (8 got in), so it does guard the rule. Frontend checks are only a convenience.

## Design decisions
- **Seat count is derived, not stored.** Availability is the count of `ACTIVE` registrations, so there is no counter to drift out of sync.
- **Cancel, never delete.** Cancelling sets status, `cancelled_by`, `cancelled_at` and an optional reason; a CHECK constraint keeps those fields consistent. Foreign keys are `RESTRICT`, so history cannot be lost by deleting a workshop or user (users are disabled instead).
- **Roles checked per request.** The JWT identifies the user; role and active flag are re-read from the database on each request. Routes with no declared roles are denied.
- **Extra workshop fields:** location (they have three sites), end time, and an optional description. Statuses: scheduled, completed, cancelled. Only scheduled workshops that have not ended accept registrations.
- **One seat per person.** An email can be registered again after cancelling, but not twice at once.

## Assumptions
- Attendees are typed in by staff and never log in; emails are normalised to lower case.
- Admins do not see or manage workshops or registrations, exactly as the permission table states.
- Times are stored in UTC and shown in each user's browser time zone.

## Trade-offs
- Bearer token in `localStorage`: simple and avoids CSRF, but readable by injected scripts. React's escaping and Helmet mitigate this; an httpOnly cookie would be the next step.
- A per-workshop row lock serialises only that workshop, which is far more throughput than a front desk needs.
- Capacity cannot be lowered below the active registrations, rather than silently over-booking.

## Skipped
Waitlist, an audit trail for workshop and account changes (registration history is complete), password reset by email, login rate limiting, refresh tokens, deployment, and browser-level UI tests. The UI was type-checked, built and served against the live API, but it was not click-tested in a browser.
