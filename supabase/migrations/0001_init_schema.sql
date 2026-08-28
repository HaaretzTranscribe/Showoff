-- ShowOff Phase 1 — Attendance & Join layer (spec section 6).
-- Deliberately thin: courses -> class_sessions -> attendance_records,
-- with no field anywhere that maps a named attendee to a future
-- anonymous response record (spec section 3). Do not add such a field
-- in a later migration without re-reading that section.
--
-- Attendance no longer hands students off to an external polling
-- provider. After submitting, students land on an in-app live-session
-- page (routed client-side by session_slug); Phase 2 will turn that
-- page into an embedded-Google-Forms viewer. Nothing in this schema
-- needs to change for that — the page only needs the slug it already
-- gets from the URL.

create extension if not exists "pgcrypto";

create type session_status as enum ('draft', 'open', 'closed');
create type attendance_source as enum ('student', 'instructor_manual');

create table users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now()
);

create index courses_owner_idx on courses(owner_user_id);

create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  session_date date not null,
  session_slug text not null unique,
  attendance_code text not null,
  status session_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index class_sessions_course_idx on class_sessions(course_id);
create index class_sessions_status_idx on class_sessions(status);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger class_sessions_set_updated_at
  before update on class_sessions
  for each row execute function set_updated_at();

-- Dataset A (spec section 3): real names, instructor-read-only.
-- Structurally disconnected from any future (Phase 2) response table —
-- there is nothing here a later migration should join on except
-- class_session_id.
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references class_sessions(id) on delete cascade,
  full_name text not null,
  normalized_name text not null,
  submitted_at timestamptz not null default now(),
  source attendance_source not null default 'student',
  unique (class_session_id, normalized_name)
);

create index attendance_records_session_idx on attendance_records(class_session_id);
