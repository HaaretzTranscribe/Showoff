# ShowOff

Student join layer — Phase 1 of the ShowOff product (see
[`ShowOff_spec_1_attendance_join.md`](./docs/ShowOff_spec_1_attendance_join.md)
and the architecture updates in
[`docs/phase_1_addendum_live_session.md`](./docs/phase_1_addendum_live_session.md)
and
[`docs/phase_1_addendum_google_form_rollcall.md`](./docs/phase_1_addendum_google_form_rollcall.md) —
both supersede parts of the original spec; read them before touching
the join/live/Studio-session flow).

This is a deliberately thin app with exactly two jobs:

1. Show the student the day's attendance code and that lesson's
   roll-call Google Form, embedded in the page.
2. Move the student into a persistent, in-app live-session page, with
   no field, token, or record anywhere that could map a student's name
   to a future (Phase 2) anonymous poll response.

**ShowOff itself never stores who attended.** Roll call happens
entirely inside the embedded Google Form; responses land in that
Form's linked Google Sheet, shared only with course staff. There is no
attendance table, no attendance-submit endpoint, and no name/email
ever touches this app's database.

Poll creation, poll answering, response storage, and the Phase 2
question-Forms viewer are explicitly out of scope for this phase — see
section 12 of the spec ("What NOT to Build") and the addenda. They
belong to a future Phase 2 session extending this same repo.

## Stack

- Vite + React + TypeScript
- Supabase (Postgres, Auth for instructors, Row Level Security) — used
  only for courses/sessions and instructor auth, not for attendance
- Tailwind CSS
- React Router
- Vitest

## Local setup

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

Run the unit tests (validation schemas — pure functions, no live
database needed):

```bash
npm test
```

## Migrations

SQL migrations live in `supabase/migrations/`, applied in filename order:

| File | Purpose |
|---|---|
| `0001_init_schema.sql` | Original schema: courses / class_sessions / attendance_records |
| `0002_rls_policies.sql` | Row Level Security (see below) |
| `0003_rate_limits.sql` | Rate-limit table for the (now-removed) attendance-submit endpoint |
| `0004_auth_user_provisioning.sql` | Auto-creates a `users` row for each instructor sign-in |
| `0005_google_form_rollcall.sql` | Drops `attendance_records` and rate limiting; adds `class_sessions.google_form_url` |

Migrations are forward-only — 0001-0004 are left as history rather
than edited, since this repo may already be linked to a live Supabase
project with them applied. Add new migrations for further schema
changes rather than editing old ones.

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

No Edge Function is needed for Phase 1 anymore — there's nothing left
for the client to write to `attendance_records`.

## Deploying to Netlify

`netlify.toml` is already set up (build command `npm run build`,
publish dir `dist`, SPA redirect so client-side routes like
`/join/...` and `/live/...` survive a hard refresh).

1. Push to the connected GitHub repo.
2. In Netlify, confirm **Site settings → Environment variables** has
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set (same values as
   your local `.env`).
3. Deploy. Until step 2 is done, the site still builds and loads, but
   shows a "Supabase project not connected" screen instead of the app
   (see `isSupabaseConfigured` in `src/lib/supabaseClient.ts`).

## Environment variables

See `.env.example`. Frontend (`VITE_*`) vars are safe to expose (anon
key only, protected by RLS).

## RLS model

- **Instructors** are real Supabase Auth users (email magic link).
  `0004_auth_user_provisioning.sql` gives each one a `public.users` row
  on first sign-in. All course/session access for instructors is
  scoped to `courses.owner_user_id`.
- **Students never get a Supabase session at all** — the app doesn't
  need one. Direct table access for the anon key is limited to the
  `public_join_sessions` view (course name, session date, status,
  attendance code, and the Google Form URL — all meant to be shown to
  anyone who opens the join link, the same way the QR code itself is
  already public) so the join and live-session pages can render
  without a login.
- There is nothing instructor-only left to read on the attendance side
  — that data lives in the Google Form's Sheet, access to which is
  controlled entirely by Google Drive sharing, outside this app.

## Student flow

`/join/:sessionSlug` → see the course, the day's code, and the
embedded roll-call Google Form (student fills in name/email/code
directly in the Form) → tap Continue → `/live/:sessionSlug`.

The student never leaves ShowOff for the Form (it's embedded via
iframe) and never leaves ShowOff after it either. `/live/:sessionSlug`
(`src/features/live/LiveSessionPage.tsx`) is a persistent, low-key
waiting screen for Phase 1 ("Waiting for the next question…" /
"ממתינים לשאלה הבאה…"). Phase 2 will turn it into an embedded viewer
for the *question* Forms, switching forms in real time as the
instructor advances through questions — the route is already keyed by
`session_slug`, the same identifier `/join` uses.

## Privacy boundary

ShowOff's database has no field anywhere that could map a named
attendee to a future anonymous poll response — because it doesn't
store attendee names or emails at all anymore; that data lives only in
the roll-call Google Form's Sheet, outside this app entirely. Nothing
is appended to the `/live/:sessionSlug` navigation beyond the slug
already in the URL — see `handleContinue` in
`src/features/join/JoinPage.tsx`. Do not add an attendance table or an
identity-mapping field in a later phase without re-reading spec
section 3 and the addenda.

## What's deliberately not here

Poll creation/answering, response storage, the Phase 2 question-Forms
viewer, rotating attendance codes, GPS/geofencing, and any
attendance-to-response identity mapping — see spec section 12 and the
addenda. These are out of scope for this phase by design, not
oversights.
