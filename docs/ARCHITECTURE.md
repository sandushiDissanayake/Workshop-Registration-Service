# Architecture

```
Browser (Next.js, apps/web)  --JSON, Bearer JWT-->  NestJS API (apps/api)  --pg-->  PostgreSQL
```

The web app is client-rendered. It holds no business rules beyond input hints; every decision is made by the API.

## API structure (`apps/api/src`)
| Part | Role |
| --- | --- |
| `auth/` | Login, `JwtAuthGuard` (verifies token, reloads user), `RolesGuard` (deny by default), `@Roles`, `@Public` |
| `users/` | Admin-only account management; prevents self-lockout and removing the last Admin |
| `workshops/` | Catalogue, filters, create and edit (Manager) |
| `registrations/` | Register, cancel, per-workshop and global history |
| `db/` | Pool and transaction helper, migration runner, migrations, seed |
| `common/` | One exception filter giving every error the same JSON shape |

Validation uses class-validator DTOs with `whitelist` and `forbidNonWhitelisted`. Passwords are hashed with bcrypt (cost 12). Helmet and an explicit CORS origin are enabled.

## Data model
`users`, `workshops`, `registrations` (see `db/migrations/001_init.sql`). Key constraints: unique lower-case email and upper-case workshop code; `capacity` 1 to 1000; `ends_at > starts_at`; a registration's cancellation fields are either all set or all empty; unique `(workshop_id, attendee_email)` where status is `ACTIVE`; foreign keys use `RESTRICT`.

## Capacity protection
All three paths that can change seat usage take the same lock, in the same order:

```
register:  BEGIN; SELECT ... FROM workshops WHERE id=$1 FOR UPDATE;
           check status and not ended; count ACTIVE; if count >= capacity -> 409
           INSERT registration; COMMIT
cancel:    BEGIN; find workshop_id; SELECT ... FROM workshops WHERE id=$1 FOR UPDATE;
           SELECT ... FROM registrations WHERE id=$2 FOR UPDATE; if CANCELLED -> 409
           UPDATE status, cancelled_by, cancelled_at; COMMIT
edit:      BEGIN; SELECT ... FROM workshops WHERE id=$1 FOR UPDATE;
           refuse capacity < active; UPDATE; COMMIT
```

Because the workshop row lock is held until commit, two transactions on one workshop can never both see a free last seat: the second waits, then re-counts and is rejected. Different workshops do not block each other. Locking workshop before registration prevents deadlocks. READ COMMITTED is sufficient because the count is taken after the lock is acquired.
