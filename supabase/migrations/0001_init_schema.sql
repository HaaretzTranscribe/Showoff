-- Live Classroom Data Lab — initial schema (spec section 11).
-- Phase 1 (Foundations): tables, enums, constraints, indexes.
-- RLS policies live in 0002_rls_policies.sql so the security model
-- is reviewable independently of the shape of the data.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

create type user_role as enum ('instructor', 'admin');
create type course_member_role as enum ('owner', 'instructor', 'ta');
create type roster_policy as enum ('required', 'optional', 'off');
create type attendance_code_policy as enum ('static', 'rotating');
create type question_type as enum (
  'single_choice', 'multiple_choice', 'number', 'scale',
  'text', 'yes_no', 'datetime', 'hidden_meta'
);
create type chart_type as enum (
  'bar', 'stacked_bar', 'stacked_bar_100', 'histogram', 'box_plot',
  'dot_strip', 'scatter', 'bubble_scatter', 'line', 'donut',
  'table', 'big_number', 'word_cloud', 'response_feed'
);
-- Session state machine (spec section 16) — kept in sync with
-- src/domain/sessionStateMachine.ts. Server-authoritative only.
create type session_state as enum (
  'draft', 'join_open', 'responses_open', 'join_closed', 'responses_locked', 'ended'
);
create type response_status as enum ('draft', 'submitted', 'locked');
create type audit_actor_type as enum ('instructor', 'student', 'system');

-- ---------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------

create table users (
  id uuid primary key default gen_random_uuid(),
  role user_role not null default 'instructor',
  auth_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_user_id uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table course_members (
  course_id uuid not null references courses(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role course_member_role not null default 'instructor',
  primary key (course_id, user_id)
);

-- student_key_hash = HMAC-SHA256(normalized_identifier, server secret).
-- Raw identifiers are never stored here (spec section 13.2).
create table student_roster (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_key_hash text not null,
  display_alias text,
  metadata_json jsonb not null default '{}'::jsonb,
  unique (course_id, student_key_hash)
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title_he text not null default '',
  title_en text not null default '',
  planned_at timestamptz,
  internal_notes text,
  config_json jsonb not null default '{}'::jsonb,
  -- Stable /join/<slug> URL (e.g. for a QR code) that always resolves to
  -- whichever class_session under this lesson is currently open for join.
  join_slug text unique,
  created_at timestamptz not null default now(),
  constraint lessons_title_not_both_empty check (title_he <> '' or title_en <> '')
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  -- Immutable after creation (enforced by trigger below). Scene bindings
  -- reference this, never the prompt label (spec section 6.2 / 27).
  stable_key text not null,
  type question_type not null,
  prompt_he text not null default '',
  prompt_en text not null default '',
  config_json jsonb not null default '{}'::jsonb,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (lesson_id, stable_key),
  constraint questions_stable_key_format check (stable_key ~ '^[a-z][a-z0-9_]{1,63}$')
);

create or replace function forbid_stable_key_update()
returns trigger as $$
begin
  if new.stable_key <> old.stable_key then
    raise exception 'questions.stable_key is immutable once created';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger questions_stable_key_immutable
  before update on questions
  for each row execute function forbid_stable_key_update();

create table question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  value text not null,
  label_he text not null default '',
  label_en text not null default '',
  order_index integer not null default 0,
  unique (question_id, value)
);

create table presentation_scenes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  name text not null,
  chart_type chart_type not null,
  -- Validated app-side against src/domain/validation.ts#sceneConfigSchema
  -- before write; is_broken flips true if a bound question is deleted/retyped.
  config_json jsonb not null,
  order_index integer not null default 0,
  is_broken boolean not null default false,
  created_at timestamptz not null default now()
);

create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete restrict,
  status session_state not null default 'draft',
  opened_at timestamptz,
  closed_at timestamptz,
  code_policy attendance_code_policy not null default 'static',
  current_code_version integer not null default 1,
  current_code text,
  code_rotated_at timestamptz
);

create index class_sessions_lesson_id_idx on class_sessions(lesson_id);
create index class_sessions_status_idx on class_sessions(status);

create table session_participants (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references class_sessions(id) on delete cascade,
  student_key_hash text not null,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (class_session_id, student_key_hash)
);

create index session_participants_auth_user_idx on session_participants(auth_user_id);

create table responses (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references class_sessions(id) on delete cascade,
  participant_id uuid not null references session_participants(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  value_json jsonb not null,
  numeric_value double precision,
  status response_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_session_id, participant_id, question_id)
);

create index responses_session_question_idx on responses(class_session_id, question_id);

-- Presentation-layer only: exclusions never delete/mutate the underlying
-- response row (spec section 8: "כל exclusion הוא presentation-layer בלבד").
create table presentation_exclusions (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references class_sessions(id) on delete cascade,
  scene_id uuid references presentation_scenes(id) on delete set null,
  participant_id uuid references session_participants(id) on delete cascade,
  response_id uuid references responses(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint presentation_exclusions_target check (
    participant_id is not null or response_id is not null
  )
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_type audit_actor_type not null,
  actor_id uuid,
  class_session_id uuid references class_sessions(id) on delete set null,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_session_idx on audit_events(class_session_id, created_at);
