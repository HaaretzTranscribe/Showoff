# ShowOff

Student attendance & join layer — Phase 1 of the ShowOff product (see
[`ShowOff_spec_1_attendance_join.md`](./docs/ShowOff_spec_1_attendance_join.md)).

This is a deliberately thin app with exactly two jobs:

1. Record named attendance at the start of class.
2. Hand the student off into an external, anonymous PollsLive session,
   with no field, token, or record anywhere that could map a
   student's name back to their PollsLive respondent id.

Poll creation, poll answering, response storage, charts, and the
presentation system are explicitly out of scope for this phase — see
section 12 of the spec ("What NOT to Build"). They belong to a future
Phase 2 session extending this same repo.

## Stack

- Vite + React + TypeScript
- Supabase (Postgres, Auth for instructors, Row Level Security)
- Tailwind CSS
- React Router
- Vitest

## Local setup

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

Run the unit tests (name normalization, validation schemas — pure
functions, no live database needed):

```bash
npm test
```

## Migrations

SQL migrations live in `supabase/migrations/`, applied in filename order:

| File | Purpose |
|---|---|
| `0001_init_schema.sql` | courses / class_sessions / attendance_records (spec section 6) |
| `0002_rls_policies.sql` | Row Level Security (see below) |
| `0003_rate_limits.sql` | Backing store for attendance-submit rate limiting |
| `0004_auth_user_provisioning.sql` | Auto-creates a `users` row for each instructor sign-in |

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

The `attendance-submit` Edge Function needs its own secret (never put
this in `.env`/`VITE_*` — it must not reach the browser):

```bash
supabase functions deploy attendance-submit
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided
automatically to Edge Functions by Supabase; no manual secret setup is
required beyond deploying the function.

## Deploying to Netlify

`netlify.toml` is already set up (build command `npm run build`,
publish dir `dist`, SPA redirect so client-side routes like `/join/...`
survive a hard refresh).

1. Push to the connected GitHub repo.
2. In Netlify, confirm **Site settings → Environment variables** has
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set (same values as
   your local `.env`).
3. Deploy. Until step 2 is done, the site still builds and loads, but
   shows a "Supabase project not connected" screen instead of the app
   (see `isSupabaseConfigured` in `src/lib/supabaseClient.ts`).

## Environment variables

See `.env.example`. Frontend (`VITE_*`) vars are safe to expose (anon
key only, protected by RLS). The service role key is an Edge Function
secret only.

## RLS model

- **Instructors** are real Supabase Auth users (email magic link).
  `0004_auth_user_provisioning.sql` gives each one a `public.users` row
  on first sign-in. All course/session/attendance access for
  instructors is scoped to `courses.owner_user_id`.
- **Students never get a Supabase session at all** — the app doesn't
  need one (spec: "students do not need accounts"). Their only write
  path is the `attendance-submit` Edge Function, which runs as the
  service role and bypasses RLS. Direct table access for the anon key
  is limited to the `public_join_sessions` view (course name, session
  date, status — nothing sensitive) so the join page can render before
  a student submits anything.
- Only the owning instructor can read, export, manually add to, or
  delete rows in `attendance_records`.

## Privacy boundary

`attendance_records` has no `pollslive_voter_id`, no
`external_user_id`, and no other field that could join a named
attendee to a PollsLive respondent. The "Continue to class" button
sends the browser straight to the session's `pollslive_join_url` with
no query parameters appended — see `handleContinue` in
`src/features/join/JoinPage.tsx` and the Edge Function's response
shape in `supabase/functions/attendance-submit/index.ts`. Do not add
one in a later phase without re-reading spec section 3.

## What's deliberately not here

Poll creation/answering, response storage, charts, Presentation
Scenes, rotating attendance codes, GPS/geofencing, and any
attendance-to-PollsLive identity mapping — see spec section 12. These
are out of scope for this phase by design, not oversights.
