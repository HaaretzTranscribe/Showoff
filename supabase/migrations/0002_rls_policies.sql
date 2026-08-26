-- Row Level Security (spec section 21: "RLS enabled and tested on all
-- exposed tables"). Two audiences only ever hold a browser-side key:
--   * instructors, authenticated via Supabase Auth (email/password/SSO)
--   * students, authenticated via Supabase anonymous sign-in, bound to
--     a session_participants row created by the join-session Edge
--     Function (which alone holds the service-role key / HMAC secret).
-- Everything privileged (identifier hashing, code validation, rate
-- limiting, state transitions) happens server-side and therefore
-- bypasses RLS via the service role — these policies define what the
-- two browser-side identities may do directly.

-- ---------------------------------------------------------------------
-- Helper functions (security definer: read across tables the caller
-- may not directly have SELECT on, without causing RLS recursion).
-- ---------------------------------------------------------------------

create or replace function app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from users where auth_id = auth.uid();
$$;

create or replace function is_course_member(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from course_members cm
    where cm.course_id = target_course_id
      and cm.user_id = app_user_id()
  );
$$;

create or replace function is_instructor_of_lesson(target_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from lessons l
    where l.id = target_lesson_id
      and is_course_member(l.course_id)
  );
$$;

create or replace function is_instructor_of_session(target_class_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from class_sessions cs
    where cs.id = target_class_session_id
      and is_instructor_of_lesson(cs.lesson_id)
  );
$$;

/** The caller's own session_participants.id for a given session, or null if not a participant. */
create or replace function my_participant_id(target_class_session_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from session_participants
  where class_session_id = target_class_session_id
    and auth_user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------

alter table users enable row level security;
alter table courses enable row level security;
alter table course_members enable row level security;
alter table student_roster enable row level security;
alter table lessons enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table presentation_scenes enable row level security;
alter table class_sessions enable row level security;
alter table session_participants enable row level security;
alter table responses enable row level security;
alter table presentation_exclusions enable row level security;
alter table audit_events enable row level security;

-- ---------------------------------------------------------------------
-- users: read own row only
-- ---------------------------------------------------------------------

create policy users_select_self on users
  for select using (auth_id = auth.uid());

-- ---------------------------------------------------------------------
-- courses / course_members: instructors within the course only
-- ---------------------------------------------------------------------

create policy courses_select_member on courses
  for select using (is_course_member(id));

create policy courses_insert_self_owner on courses
  for insert with check (owner_user_id = app_user_id());

create policy courses_update_member on courses
  for update using (is_course_member(id));

create policy course_members_select_member on course_members
  for select using (is_course_member(course_id));

create policy course_members_manage_owner on course_members
  for all using (
    exists (
      select 1 from courses c
      where c.id = course_id and c.owner_user_id = app_user_id()
    )
  );

-- ---------------------------------------------------------------------
-- student_roster: instructor-only. Contains only hashed identifiers,
-- never raw ones, but is still restricted to course instructors.
-- ---------------------------------------------------------------------

create policy student_roster_instructor_all on student_roster
  for all using (is_course_member(course_id))
  with check (is_course_member(course_id));

-- ---------------------------------------------------------------------
-- lessons: instructor-only (students never query this table directly;
-- they get questionnaire content via `questions`, scoped to a session
-- they've already joined).
-- ---------------------------------------------------------------------

create policy lessons_instructor_all on lessons
  for all using (is_course_member(course_id))
  with check (is_course_member(course_id));

-- ---------------------------------------------------------------------
-- questions / question_options: instructors of the lesson manage them.
-- Students may only SELECT questions belonging to a lesson whose
-- class_session they have already joined as a participant.
-- ---------------------------------------------------------------------

create policy questions_instructor_all on questions
  for all using (is_instructor_of_lesson(lesson_id))
  with check (is_instructor_of_lesson(lesson_id));

create policy questions_select_joined_participant on questions
  for select using (
    exists (
      select 1 from class_sessions cs
      where cs.lesson_id = questions.lesson_id
        and my_participant_id(cs.id) is not null
    )
  );

create policy question_options_instructor_all on question_options
  for all using (
    is_instructor_of_lesson((select lesson_id from questions q where q.id = question_id))
  )
  with check (
    is_instructor_of_lesson((select lesson_id from questions q where q.id = question_id))
  );

create policy question_options_select_joined_participant on question_options
  for select using (
    exists (
      select 1
      from questions q
      join class_sessions cs on cs.lesson_id = q.lesson_id
      where q.id = question_options.question_id
        and my_participant_id(cs.id) is not null
    )
  );

-- ---------------------------------------------------------------------
-- presentation_scenes: instructor-only for Phase 1 (public
-- Presentation Viewer role is out of scope until it exists).
-- ---------------------------------------------------------------------

create policy presentation_scenes_instructor_all on presentation_scenes
  for all using (is_instructor_of_lesson(lesson_id))
  with check (is_instructor_of_lesson(lesson_id));

-- ---------------------------------------------------------------------
-- class_sessions: instructors manage; a joined student may read only
-- the session they belong to (status, code_policy — never `current_code`
-- of a *different* session). current_code is only meaningful to the
-- instructor and to the join-session Edge Function (service role).
-- ---------------------------------------------------------------------

create policy class_sessions_instructor_all on class_sessions
  for all using (is_instructor_of_lesson(lesson_id))
  with check (is_instructor_of_lesson(lesson_id));

create policy class_sessions_select_participant on class_sessions
  for select using (my_participant_id(id) is not null);

-- ---------------------------------------------------------------------
-- session_participants: a student may see/update only their own row
-- (spec 21: "Student A לא יכול לקרוא responses של Student B" — same
-- principle applied to participant identity). Instructors see all
-- participants of their own sessions (for live counts, attendance).
-- ---------------------------------------------------------------------

create policy session_participants_select_self on session_participants
  for select using (auth_user_id = auth.uid());

create policy session_participants_update_self on session_participants
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy session_participants_instructor_select on session_participants
  for select using (is_instructor_of_session(class_session_id));

-- Row creation itself is performed by the join-session Edge Function
-- with the service role (it must verify code + roster + rate limits
-- first), so there is no client-side insert policy here on purpose.

-- ---------------------------------------------------------------------
-- responses: the core isolation boundary. A student can only ever
-- touch rows tied to their own participant_id, and only while the
-- session is in a state that allows response writes. Instructors can
-- read all responses of sessions in their own courses.
-- ---------------------------------------------------------------------

create policy responses_select_own on responses
  for select using (participant_id = my_participant_id(class_session_id));

create policy responses_insert_own on responses
  for insert with check (
    participant_id = my_participant_id(class_session_id)
    and exists (
      select 1 from class_sessions cs
      join questions q on q.lesson_id = cs.lesson_id
      where cs.id = responses.class_session_id
        and cs.status in ('responses_open', 'join_closed')
        and q.id = responses.question_id
    )
  );

create policy responses_update_own on responses
  for update using (
    participant_id = my_participant_id(class_session_id)
  )
  with check (
    participant_id = my_participant_id(class_session_id)
    and exists (
      select 1 from class_sessions cs
      where cs.id = responses.class_session_id
        and cs.status in ('responses_open', 'join_closed')
    )
  );

create policy responses_instructor_select on responses
  for select using (is_instructor_of_session(class_session_id));

-- ---------------------------------------------------------------------
-- presentation_exclusions: instructor-only (presentation-layer state,
-- never touched by students; spec section 8).
-- ---------------------------------------------------------------------

create policy presentation_exclusions_instructor_all on presentation_exclusions
  for all using (is_instructor_of_session(class_session_id))
  with check (is_instructor_of_session(class_session_id));

-- ---------------------------------------------------------------------
-- audit_events: instructors may read audit history for their own
-- sessions. Writes happen only via service role (Edge Functions /
-- server routes), so there is deliberately no insert policy — this
-- keeps the audit trail tamper-resistant from the browser.
-- ---------------------------------------------------------------------

create policy audit_events_instructor_select on audit_events
  for select using (
    class_session_id is not null and is_instructor_of_session(class_session_id)
  );
