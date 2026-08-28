-- RLS (spec section 10). Students never get a Supabase session at all
-- (spec: "students do not need accounts") — their only write path is
-- the attendance-submit Edge Function's service role, which bypasses
-- RLS entirely. Everything below governs instructor access plus the
-- narrow public read needed to render the join page.

alter table users enable row level security;
alter table courses enable row level security;
alter table class_sessions enable row level security;
alter table attendance_records enable row level security;

create policy users_select_self on users
  for select using (auth_id = auth.uid());

create or replace function current_user_id()
returns uuid language sql stable as $$
  select id from users where auth_id = auth.uid();
$$;

create policy courses_select_owner on courses
  for select using (owner_user_id = current_user_id());

create policy courses_insert_owner on courses
  for insert with check (owner_user_id = current_user_id());

create policy courses_update_owner on courses
  for update using (owner_user_id = current_user_id());

create policy courses_delete_owner on courses
  for delete using (owner_user_id = current_user_id());

create or replace function is_course_owner(target_course_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from courses
    where id = target_course_id and owner_user_id = current_user_id()
  );
$$;

create policy class_sessions_select_owner on class_sessions
  for select using (is_course_owner(course_id));

create policy class_sessions_insert_owner on class_sessions
  for insert with check (is_course_owner(course_id));

create policy class_sessions_update_owner on class_sessions
  for update using (is_course_owner(course_id));

create policy class_sessions_delete_owner on class_sessions
  for delete using (is_course_owner(course_id));

create or replace function is_session_owner(target_session_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from class_sessions cs
    join courses c on c.id = cs.course_id
    where cs.id = target_session_id and c.owner_user_id = current_user_id()
  );
$$;

create policy attendance_records_select_owner on attendance_records
  for select using (is_session_owner(class_session_id));

-- Instructor manual add only (spec section 4: instructor can add an
-- attendee). The student submit path never uses this policy — it goes
-- through the Edge Function's service role, which bypasses RLS.
create policy attendance_records_insert_owner on attendance_records
  for insert with check (
    is_session_owner(class_session_id) and source = 'instructor_manual'
  );

create policy attendance_records_delete_owner on attendance_records
  for delete using (is_session_owner(class_session_id));

-- Public join page needs course name / session date / status for any
-- known slug (spec section 8 error states distinguish "not open yet"
-- from "closed", so status must be readable pre-submit). None of this
-- is sensitive; the view exists so anon never gets a direct grant on
-- the underlying tables.
create view public_join_sessions as
  select
    cs.session_slug,
    cs.title,
    cs.session_date,
    cs.status,
    c.name as course_name
  from class_sessions cs
  join courses c on c.id = cs.course_id;

grant select on public_join_sessions to anon, authenticated;
