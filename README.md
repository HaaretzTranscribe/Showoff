# ShowOff

ShowOff's student join layer, plus the first slice of Phase 2. See, in
order, the spec and the architecture updates that superseded parts of
it: [`ShowOff_spec_1_attendance_join.md`](./docs/ShowOff_spec_1_attendance_join.md) →
[`phase_1_addendum_live_session.md`](./docs/phase_1_addendum_live_session.md) →
[`phase_1_addendum_google_form_rollcall.md`](./docs/phase_1_addendum_google_form_rollcall.md) →
[`phase_1_addendum_no_backend.md`](./docs/phase_1_addendum_no_backend.md) →
[`phase_2_addendum_live_questions.md`](./docs/phase_2_addendum_live_questions.md) —
read the last two before touching anything data-related or the live
question flow.

This is a deliberately thin app with three jobs:

1. Show the student that lesson's roll-call Google Form, embedded in
   the page. The attendance code is deliberately **not** shown here —
   see "Student flow" below.
2. Move the student into a persistent, in-app live-session page.
3. Let the instructor push a question's Google Form live to every
   student on that page at once, with one click, no student refresh.

**Almost entirely backend-free** — courses/lessons/roll-call/questions
all live in published Google Sheets, fetched as CSV, no database, no
instructor login. The one exception is the live "which question is
active right now" flag, which needs a real (if tiny) backend to push
updates — see "Live question control" below.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- React Router (`/join/:sessionSlug`, `/live/:sessionSlug`,
  `/control/:sessionSlug`)
- Vitest
- Two published Google Sheets, fetched as CSV — the data layer for
  everything except live question state
- One Netlify Function + Netlify Blobs — the data layer for live
  question state only

## Local setup

```bash
npm install
cp .env.example .env   # fill in VITE_SESSIONS_SHEET_CSV_URL and VITE_QUESTIONS_SHEET_CSV_URL
npm run dev
```

`netlify/functions/` (the live question backend) doesn't run under
plain `vite dev` — see "Live question control" below.

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

`/live/:sessionSlug` (`src/features/live/LiveSessionPage.tsx`) shows a
low-key waiting screen ("Waiting for the next question…" /
"ממתינים לשאלה הבאה…") until the instructor activates a question, at
which point that question's Form appears automatically — see "Live
question control" below.

## Live question control

`/control/:sessionSlug` — unlisted, not linked from any student-facing
page — lists that lesson's questions (from a second published Sheet,
see `.env.example`) as buttons. Click one to make it live; every
student on `/live/:sessionSlug` for that lesson sees it appear within
a few seconds, no refresh. Click "Waiting / no active question" to go
back to the waiting screen.

This is the one part of the app with a real backend:
`netlify/functions/active-question.mts` + Netlify Blobs, both part of
this same Netlify project (no new service). Student pages poll it
every 3 seconds; this is not instant push. Full design and trade-offs
in [`phase_2_addendum_live_questions.md`](./docs/phase_2_addendum_live_questions.md) —
read it before changing this flow, especially the "access control —
deliberately none" section.

## Privacy boundary

ShowOff holds no data about students at all — not even in the config
layer, which only ever contains course/lesson metadata staff typed in
themselves. There is nothing to accidentally join a named attendee to
a future anonymous poll response, because there's no student data
here to join. Do not add one without re-reading spec section 3 and the
addenda.

## What's deliberately not here

Poll response retrieval/aggregation, Google Sheets integration for
answers, visualization, anonymous respondent IDs, cross-question
joins, charts, rotating attendance codes, GPS/geofencing, and any
attendance-to-response identity mapping — see spec section 12 and the
addenda. These are out of scope by design, not
oversights.
