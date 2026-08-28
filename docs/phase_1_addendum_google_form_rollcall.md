# Phase 1 addendum: roll call moves to an embedded Google Form

This supersedes [`phase_1_addendum_live_session.md`](./phase_1_addendum_live_session.md)'s
assumption that ShowOff itself records attendance, and supersedes
[`ShowOff_spec_1_attendance_join.md`](./ShowOff_spec_1_attendance_join.md)
sections 2 (steps 2-4), 3 ("Dataset A"), 6 (`attendance_records`), 7
(duplicate handling), and 11 (the `/api/attendance/submit` route) —
all of that assumed ShowOff's own database would hold named attendance
rows. It no longer does.

## What changed and why

The course only has three people who need to see who attended: the
instructor, a partner-professor, and an assistant. That's a fixed,
trusted, three-person audience — not the multi-instructor,
many-courses case the original Supabase/RLS attendance design was
built to scope data for. Given that, and given Phase 2 was always
going to use embedded Google Forms for the actual poll questions, it's
simpler to use the same mechanism for roll call itself:

- Each lesson gets its own Google Form (name, email, and the on-screen
  code as questions). Its responses land in a Sheet shared with just
  those three people.
- The `/join/:sessionSlug` page shows the course/date, the day's
  attendance code (large, readable), and that lesson's Form embedded
  in an iframe. The student fills in the Form directly — ShowOff never
  sees the name, email, or submitted code.
- The code is **not** authenticated by ShowOff or by the Form. It's
  informational only: the instructor/assistant cross-check each
  response's Form-recorded timestamp and the submitted code against
  what the actual code was that day, by hand, after class. This was a
  deliberate choice — see the chat decision it came from (no live
  gating needed, Forms already timestamps every response).
- Email is asked in the Form as a de-duplication aid for whoever
  reviews the sheet, not as a hard constraint — students are not
  required to have a Google account, so Google Forms' native "limit to
  1 response" (which requires sign-in) isn't used. Duplicate entries
  are possible and are expected to be resolved manually.

## What was removed

- `attendance_records` table, `attendance_source` enum, and
  `rate_limit_hits` table (migration `0005_google_form_rollcall.sql`).
- The `attendance-submit` Edge Function entirely — there is nothing
  left for a student's browser to write to Supabase.
- `normalizeName` / `isPlausibleName` / `normalizeAttendanceCode` and
  the attendance-submit request schema — dead code once there's no
  submission to validate.
- Studio's attendance list/export/manual-add/remove UI — there's
  nothing in ShowOff's database to list. The `rollCallNote` copy on
  the session detail page points instructors at the Form's Sheet
  instead.

## What was added

- `class_sessions.google_form_url` — the embed URL for that lesson's
  roll-call Form, set/edited from Studio the same way the attendance
  code already was.
- `public_join_sessions` view now also exposes `attendance_code` and
  `google_form_url` (both non-sensitive, meant to be shown to anyone
  who opens the join link — same trust level as the QR code itself).
- `src/lib/googleForm.ts#toEmbedUrl` — appends `?embedded=true` to
  whatever Form URL the instructor pastes.

## What Phase 2 still needs to be careful of

The privacy boundary is now easier to keep, not harder: ShowOff has no
named-attendee data of any kind to accidentally join to a future
anonymous poll response, because it doesn't hold named-attendee data
at all. Phase 2's question-Forms viewer on `/live/:sessionSlug` should
keep it that way — don't add a table that records which student saw
which question, or anything else that could be cross-referenced back
to a roll-call Form response.
