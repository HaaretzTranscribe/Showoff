# Phase 1 addendum: no PollsLive, in-app live-session page instead

> **Partially superseded** by
> [`phase_1_addendum_google_form_rollcall.md`](./phase_1_addendum_google_form_rollcall.md):
> the "students stay in ShowOff and land on `/live/:sessionSlug`" part
> below still holds, but this doc's assumption that ShowOff itself
> records attendance no longer does — read the newer addendum for how
> roll call actually works now.

This supersedes section 2 ("Core Student Flow" step 5), section 3's
PollsLive-specific wording, and any other part of
[`ShowOff_spec_1_attendance_join.md`](./ShowOff_spec_1_attendance_join.md)
that describes handing students off to an external PollsLive product.
Everything else in that spec still applies as written.

## What changed

PollsLive is no longer the polling provider. There is no PollsLive
redirect, no PollsLive join URL, and no PollsLive-specific integration
anywhere in this codebase.

After a student successfully completes attendance, they stay inside
ShowOff and are routed to a persistent student live-session page at
`/live/:sessionSlug` (`src/features/live/LiveSessionPage.tsx`). For
Phase 1 that page is only a polished waiting state — "Waiting for the
next question…" / "ממתינים לשאלה הבאה…" — with no live data.

## What Phase 2 will build on this

Phase 2 will turn `/live/:sessionSlug` into a viewer that embeds
Google Forms. The instructor will select/open Question 1, Question 2,
Question 3, etc. from the Studio, and all connected student pages on
that session will switch their embedded iframe to the corresponding
form in real time (almost certainly via Supabase Realtime on
`class_sessions`, keyed by the session's id/slug).

Phase 1 deliberately did **not** build that yet. It only ensured the
architecture supports it cleanly:

- Attendance submission ends at `/live/:sessionSlug` (an internal
  route), not an external redirect.
- The live-session page already has the ShowOff session identifier
  (`sessionSlug`, from the URL) — the same one `/join` uses — so Phase
  2 can resolve whatever it needs (current active question, embed URL,
  etc.) from that without changing the attendance flow.
- No schema changes were made for Phase 2 beyond removing the
  now-unused `pollslive_join_url` column. In particular, nothing was
  added to `class_sessions` or `attendance_records` for questions, the
  active question pointer, or Google Forms URLs — that's Phase 2's
  job, once its own shape is known.

## Privacy boundary — unchanged and still hard

The core privacy requirement from spec section 3 still applies,
generalized from "PollsLive respondent id" to "any future anonymous
response identity": there must be no field, token, cookie, URL
parameter, database record, or server-side mapping that connects a
named `attendance_records` row to a future anonymous Google Forms
response. `attendance-submit` returns only `{ success, alreadyRecorded
}` — no identifiers of any kind — and the client navigates to
`/live/:sessionSlug` using only the slug it already had. Phase 2 must
preserve this: whatever mechanism it uses to track which anonymous
response came from which live-session viewer must not be joinable back
to `attendance_records`.
