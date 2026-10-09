# Workshop Registration Service

Registration and scheduling for a community training centre. Front-desk staff register and cancel attendees, a programme manager schedules workshops, and an administrator manages staff accounts. A workshop can **never** hold more active registrations than its capacity, even when several people register at the same moment.

- **Web:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **API:** NestJS 10, TypeScript, REST, Swagger at `/docs`
- **Database:** PostgreSQL 16 with SQL migrations (`pg` driver, parameterized queries)
- **Tests:** Jest + Supertest against a real PostgreSQL database

## Prerequisites

- Node.js 20.12+ (developed on 22) and npm 10+
- PostgreSQL 16, either via Docker (below) or an existing server

## Quick start

```bash
# 1. Install dependencies for the whole monorepo
npm install

# 2. Start PostgreSQL (Docker). Skip if you already have a server (see "Without Docker").
npm run db:up

# 3. Configure environment
cp .env.example apps/api/.env          # API settings (database URL, JWT secret, seed admin)
cp .env.example apps/web/.env.local    # only NEXT_PUBLIC_API_URL is used by the web app

# 4. Create the schema and load sample data (migrations run before seeding)
npm run db:migrate
npm run db:seed

# 5. Run both apps (two terminals)
npm run dev:api     # http://localhost:4000   Swagger: http://localhost:4000/docs
npm run dev:web     # http://localhost:3000
```

The API reads `apps/api/.env` automatically. `JWT_SECRET` must be at least 32 characters; replace the placeholder for anything beyond local use. The API refuses to start without it.

### Development logins (seeded, dev-only)

| Role    | Email                      | Password          |
| ------- | -------------------------- | ----------------- |
| Admin   | `admin@workshops.local`    | `Admin123!dev`    |
| Manager | `manager@workshops.local`  | `Workshop123!dev` |
| Staff   | `staff@workshops.local`    | `Workshop123!dev` |
| Staff   | `desk@workshops.local`     | `Workshop123!dev` |

The Admin credentials come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. The seed adds eight sample workshops (one full, one with a single seat left, one completed, one cancelled) and some registrations, including a cancelled one. It is safe to run repeatedly.

### Without Docker

Create a database and user, then point `DATABASE_URL` at it:

```sql
CREATE USER workshop WITH PASSWORD 'workshop' CREATEDB;
CREATE DATABASE workshop OWNER workshop;
```

## Who can do what

| Action                                   | Admin | Manager | Staff |
| ---------------------------------------- | :---: | :-----: | :---: |
| Create users and set roles               |  yes  |         |       |
| Create and edit workshops                |       |   yes   |       |
| Register and cancel attendees            |       |   yes   |  yes  |
| View workshops, registrations, history   |       |   yes   |  yes  |

Every rule is enforced by the backend. Roles are checked on each request against the current database record, so disabling or demoting a user takes effect immediately. The UI hides what a role cannot use, but that is only a convenience.

## Commands

| Command                | What it does                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run db:up`        | Start PostgreSQL via Docker Compose                                 |
| `npm run db:migrate`   | Apply pending SQL migrations (`apps/api/src/db/migrations`)         |
| `npm run db:seed`      | Run migrations, then load the dev admin, users and sample workshops |
| `npm run dev:api`      | API in watch mode on port 4000                                      |
| `npm run dev:web`      | Web app in dev mode on port 3000                                    |
| `npm run build`        | Production build of API and web                                     |
| `npm test`             | API tests (needs PostgreSQL; see below)                             |

Production start: `npm run build`, then `npm start -w apps/api` and `npm start -w apps/web`.

## Tests

```bash
npm test
```

The tests use a separate database called `workshop_test`, created automatically from your `DATABASE_URL` (the database user needs `CREATEDB`; the Docker user has it). They cover authentication, the permission matrix, the registration and cancellation lifecycle with history, workshop filters, and concurrency: 40 simultaneous registrations for 5 seats (exactly 5 succeed) and registrations racing against cancellations.

## Project layout

```
apps/api    NestJS API: auth, users, workshops, registrations, SQL migrations, seed, tests
apps/web    Next.js app: sign-in, workshops, details, history, user admin
docs        DECISIONS.md, ARCHITECTURE.md, API.md
docker-compose.yml, .env.example
```

See `docs/DECISIONS.md` for design decisions and trade-offs, `docs/ARCHITECTURE.md` for how capacity is protected, and `docs/API.md` for the endpoint reference.
