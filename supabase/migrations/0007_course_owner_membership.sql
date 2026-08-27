-- Fixes a chicken-and-egg RLS bug: courses' only SELECT policy
-- (courses_select_member) requires a course_members row, but nothing
-- created one for the owner at course-creation time. INSERT ...
-- RETURNING then fails RLS on the same statement that created the row,
-- surfacing as "new row violates row-level security policy for table
-- courses" even though the INSERT's own WITH CHECK was satisfied.
--
-- This trigger runs as part of the same INSERT statement (security
-- definer, so it bypasses RLS on course_members), so by the time
-- RETURNING evaluates, the owner is already a member.

create or replace function handle_new_course()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into course_members (course_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (course_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_course_created
  after insert on courses
  for each row execute function handle_new_course();
