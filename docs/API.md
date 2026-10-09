# API reference

Base URL `http://localhost:4000`. Interactive docs at `/docs` (Swagger). Every endpoint except login needs `Authorization: Bearer <token>`. JSON in and out, camelCase fields.

## Endpoints
| Method and path | Roles | Purpose |
| --- | --- | --- |
| `POST /auth/login` | public | `{email, password}` returns `{accessToken, user}` |
| `GET /auth/me` | any | Current user |
| `GET /users` | Admin | List users |
| `POST /users` | Admin | Create user `{email, name, role, password}` |
| `PATCH /users/:id` | Admin | Change `name`, `role`, `isActive`, `password` |
| `GET /workshops` | Manager, Staff | List. Filters: `q`, `status`, `from`, `to` (ISO, matched on start time, `to` exclusive), `availability=available` or `full` |
| `GET /workshops/:id` | Manager, Staff | One workshop with `activeRegistrations` and `seatsAvailable` |
| `POST /workshops` | Manager | Create `{code, title, instructor, location, startsAt, endsAt, capacity, description?, status?}` |
| `PATCH /workshops/:id` | Manager | Partial update |
| `GET /workshops/:id/registrations` | Manager, Staff | Every record for a workshop, active and cancelled |
| `POST /workshops/:id/registrations` | Manager, Staff | Register `{attendeeName, attendeeEmail}` |
| `POST /registrations/:id/cancel` | Manager, Staff | Cancel `{reason?}`; the record is kept |
| `GET /registrations` | Manager, Staff | Full history. Filters `workshopId`, `status`, `q`, `limit` (max 200), `offset`; returns `{total, items}` |

Registration items include `registeredBy`, `registeredAt`, `cancelledBy`, `cancelledAt` and `cancelReason`.

## Errors
Every error is `{statusCode, error, message, code?, details?}`.

| Status | `code` | When |
| --- | --- | --- |
| 400 | none (`details` lists fields) | Validation failed |
| 400 | `INVALID_TIME_RANGE`, `SELF_LOCKOUT`, `LAST_ADMIN` | Business rule on input |
| 401 | none | Missing or invalid token, bad login, disabled account |
| 403 | none | Role not permitted |
| 404 | none | Workshop, user or registration not found |
| 409 | `WORKSHOP_FULL` | No seats left |
| 409 | `WORKSHOP_NOT_OPEN`, `WORKSHOP_ENDED` | Workshop is completed or cancelled, or already ended |
| 409 | `ALREADY_REGISTERED` | Email already holds an active seat |
| 409 | `ALREADY_CANCELLED` | Registration already cancelled |
| 409 | `CAPACITY_BELOW_ACTIVE` | Capacity edit below active registrations |
| 409 | `CODE_TAKEN`, `EMAIL_TAKEN` | Duplicate workshop code or user email |
