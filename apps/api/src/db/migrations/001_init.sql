CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'STAFF');
CREATE TYPE workshop_status AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE registration_status AS ENUM ('ACTIVE', 'CANCELLED');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  name          text NOT NULL,
  password_hash text NOT NULL,
  role          user_role NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lower CHECK (email = lower(email))
);
CREATE UNIQUE INDEX users_email_key ON users (email);

CREATE TABLE workshops (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,
  title       text NOT NULL,
  instructor  text NOT NULL,
  description text,
  location    text NOT NULL,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  capacity    integer NOT NULL,
  status      workshop_status NOT NULL DEFAULT 'SCHEDULED',
  created_by  uuid NOT NULL REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workshops_capacity_positive CHECK (capacity > 0 AND capacity <= 1000),
  CONSTRAINT workshops_time_order CHECK (ends_at > starts_at),
  CONSTRAINT workshops_code_upper CHECK (code = upper(code))
);
CREATE UNIQUE INDEX workshops_code_key ON workshops (code);
CREATE INDEX workshops_starts_at_idx ON workshops (starts_at);
CREATE INDEX workshops_status_idx ON workshops (status);

-- Registrations are never deleted. Cancelling flips status and records who/when.
CREATE TABLE registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id     uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  attendee_name   text NOT NULL,
  attendee_email  text NOT NULL,
  status          registration_status NOT NULL DEFAULT 'ACTIVE',
  registered_by   uuid NOT NULL REFERENCES users(id),
  registered_at   timestamptz NOT NULL DEFAULT now(),
  cancelled_by    uuid REFERENCES users(id),
  cancelled_at    timestamptz,
  cancel_reason   text,
  CONSTRAINT registrations_email_lower CHECK (attendee_email = lower(attendee_email)),
  CONSTRAINT registrations_cancel_consistent CHECK (
    (status = 'ACTIVE' AND cancelled_by IS NULL AND cancelled_at IS NULL)
    OR (status = 'CANCELLED' AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL)
  )
);
CREATE INDEX registrations_workshop_status_idx ON registrations (workshop_id, status);
CREATE INDEX registrations_registered_at_idx ON registrations (registered_at DESC);
-- The same person cannot hold two active seats in one workshop.
CREATE UNIQUE INDEX registrations_one_active_per_email
  ON registrations (workshop_id, attendee_email) WHERE status = 'ACTIVE';
