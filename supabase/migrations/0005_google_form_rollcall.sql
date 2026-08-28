-- Roll call moves to an embedded Google Form per lesson (chat decision,
-- 2026-08-28): students type their name/email/the on-screen code
-- directly into that lesson's Form, whose responses land in a Sheet
-- shared only with course staff. ShowOff itself no longer stores who
-- attended, or even accepts an attendance write — the instructor
-- checks Form response timestamps against the code shown that day.
--
-- This is a forward migration rather than an edit to 0001, since this
-- project may already be linked to a live Supabase project with
-- 0001-0004 applied. Do not renumber or edit those files; add new
-- forward migrations for further schema changes instead.
--
-- Do not re-add an attendance table, or any column that could map a
-- named attendee to a future anonymous poll response, without
-- re-reading docs/phase_1_addendum_live_session.md and the privacy
-- boundary in docs/ShowOff_spec_1_attendance_join.md section 3.

drop table if exists attendance_records;
drop type if exists attendance_source;

-- Was only used for attendance-submit's rate limiting; that endpoint
-- no longer exists.
drop table if exists rate_limit_hits;

-- Per-lesson roll-call Google Form, e.g.
-- https://docs.google.com/forms/d/e/FORM_ID/viewform — nullable so an
-- instructor can create a session before pasting the Form link.
alter table class_sessions add column google_form_url text;

-- The join page now needs to show the code and the Form to embed, in
-- addition to the course/date/status it already showed.
drop view if exists public_join_sessions;
create view public_join_sessions as
  select
    cs.session_slug,
    cs.title,
    cs.session_date,
    cs.status,
    cs.attendance_code,
    cs.google_form_url,
    c.name as course_name
  from class_sessions cs
  join courses c on c.id = cs.course_id;

grant select on public_join_sessions to anon, authenticated;
