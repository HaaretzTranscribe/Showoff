-- Separates "who attended" from "what they answered" (spec section 18:
-- attendance export is a distinct artifact from the response export).
-- The join-session Edge Function is the only thing that ever sees a
-- student's raw name; it writes it here, keyed by participant_id, and
-- nothing else in the schema ever joins this table to `responses`.
-- Only the instructor can read it — students, and the public
-- Presentation route, never can.

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references class_sessions(id) on delete cascade,
  participant_id uuid not null references session_participants(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (participant_id)
);

alter table attendance_records enable row level security;

create policy attendance_records_instructor_select on attendance_records
  for select using (is_instructor_of_session(class_session_id));

-- No insert/update policy: only the join-session Edge Function (service
-- role) writes this, the same way audit_events is written.
