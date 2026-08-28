# ShowOff

Student join layer — Phase 1 of the ShowOff product (see
[`ShowOff_spec_1_attendance_join.md`](./docs/ShowOff_spec_1_attendance_join.md)
and, in order, the architecture updates that superseded parts of it:
[`phase_1_addendum_live_session.md`](./docs/phase_1_addendum_live_session.md) →
[`phase_1_addendum_google_form_rollcall.md`](./docs/phase_1_addendum_google_form_rollcall.md) →
[`phase_1_addendum_no_backend.md`](./docs/phase_1_addendum_no_backend.md) —
that last one describes the app as it actually is today; read it
before touching anything data-related).

This is a deliberately thin, **backend-free** app with exactly two jobs:

1. Show the student that lesson's roll-call Google Form, embedded in
   the page. The attendance code is deliberately **not** shown here —
   see "Student flow" below.
2. Move the student into a persistent, in-app live-session page.

**There is no database, no server, and no instructor login.**
Everything the app needs to know — course name, lesson title/date,
code, Google Form URL, open/closed status — lives in one published
Google Sheet that the app fetches as CSV. Roll call itself happens
entirely inside the embedded Google Form; responses land in that
Form's own linked Sheet, shared only with course staff. ShowOff never
sees a student's name, email, or submitted code.

Poll creation/answering, response storage, and the Phase 2
question-Forms viewer are explicitly out of scope for this phase — see
section 12 of the original spec and the addenda. They belong to a
future Phase 2 session extending this same repo.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- React Router (two routes: `/join/:sessionSlug`, `/live/:sessionSlug`)
- Vitest
- A published Google Sheet, fetched as CSV — the entire data layer

## Local setup

```bash
npm install
cp .env.example .env   # fill in VITE_SESSIONS_SHEET_CSV_URL
npm run dev
```

Run the unit tests (the CSV parser — the only nontrivial pure logic
left in the app):

```bash
npm test
```

## The Google Sheet

One spreadsheet, one tab, one row per lesson. See
[`docs/phase_1_addendum_no_backend.md`](./docs/phase_1_addendum_no_backend.md)
for the exact column contract, but in short: `lesson_number` (the
`/join/<this>` URL — e.g. `1`.."12" / `1e`.."12e" for parallel he/en
tracks), `course_name`, `session_title`, `session_date`,
`attendance_code`, `google_form_url`, `status` (`draft` / `open` /
`closed`).

To connect it: **File → Share → Publish to web**, pick that sheet,
format **CSV**, and put the resulting URL in `VITE_SESSIONS_SHEET_CSV_URL`.
Use the *publish-to-web* URL, not a regular "Share" link — it's the
one that supports anonymous cross-origin fetches from the browser.

Opening/closing attendance, changing the code, and setting up a new
lesson's Form URL are all just editing that spreadsheet — there's no
admin UI in this app anymore.

## Deploying to Netlify

`netlify.toml` is already set up (build command `npm run build`,
publish dir `dist`, SPA redirect so client-side routes like
`/join/...` and `/live/...` survive a hard refresh).

1. Push to the connected GitHub repo.
2. In Netlify, confirm **Site settings → Environment variables** has
   `VITE_SESSIONS_SHEET_CSV_URL` set (same value as your local `.env`).
3. Deploy. Until step 2 is done, the site still builds and loads, but
   shows a "Sessions sheet not connected" screen instead of the app
   (see `isSheetConfigured` in `src/lib/sheetSessions.ts`).

## Environment variables

See `.env.example`. `VITE_SESSIONS_SHEET_CSV_URL` is safe to expose in
the sense that it's fetched by every visitor's browser anyway — but
note that means `attendance_code` is technically present in that
fetch too, even though the UI never renders it (see "Student flow" and
the no-backend addendum's trade-offs section).

## Student flow

`/join/:sessionSlug` → see the course and the embedded roll-call
Google Form (student fills in name/email/code directly in the Form) →
tap Continue → `/live/:sessionSlug`.

**The attendance code is never shown on this page.** It's meant to be
projected on the instructor's in-class slideshow instead — students
read it off the screen in the room, not off the website — otherwise
the code would prove nothing (anyone with the join link could see it).
`attendance_code` still lives in the Sheet purely as the instructor's
own record for the manual cross-check against Form response
timestamps.

`/live/:sessionSlug` (`src/features/live/LiveSessionPage.tsx`) is a
persistent, low-key waiting screen for Phase 1 ("Waiting for the next
question…" / "ממתינים לשאלה הבאה…"). Phase 2 will turn it into an
embedded viewer for the *question* Forms, switching forms in real time
as the instructor advances through questions — the route is already
keyed by `session_slug`, the same identifier `/join` uses. A CSV poll
is likely too slow for that real-time switch, though — see the
"known trade-offs" section of the no-backend addendum before building
Phase 2 on top of the same fetch mechanism.

## Privacy boundary

ShowOff holds no data about students at all — not even in the config
layer, which only ever contains course/lesson metadata staff typed in
themselves. There is nothing to accidentally join a named attendee to
a future anonymous poll response, because there's no student data
here to join. Do not add one without re-reading spec section 3 and the
addenda.

## What's deliberately not here

Poll creation/answering, response storage, the Phase 2 question-Forms
viewer, rotating attendance codes, GPS/geofencing, any backend at all,
and any attendance-to-response identity mapping — see spec section 12
and the addenda. These are out of scope for this phase by design, not
oversights.
