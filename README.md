# ShowOff

MVP+ implementation of the spec in [`live_data_classroom_spec_he_v3.docx`](./live_data_classroom_spec_he_v3.docx)
(Hebrew product/technical spec). This repo currently implements **Phase 1 —
Foundations** per the spec's own build order (section 25):

- Postgres schema + RLS (`supabase/migrations/`)
- Typed domain models + Zod validation (`src/domain/`)
- The session state machine, as a pure/tested function (`src/domain/sessionStateMachine.ts`)
- Student anonymous auth + Join flow, with a static session code (`src/features/join/`)
- Basic questionnaire response submit + a live respondent counter (`src/features/join/`, `src/features/presentation/`)
- Minimal Instructor Studio CRUD for Courses/Lessons/Questions (`src/features/studio/`)
- A central he/en i18n layer with RTL/LTR direction switching (`src/i18n/`)

Phases 2–5 (Scene Builder, Presentation Mode, Live Override, outlier
exclusion, rotating codes, load testing, accessibility QA) are **not yet
built** — see section 25 of the spec for the intended order.

## Local setup

This machine had neither Node.js nor the Supabase CLI installed when this
repo was scaffolded, so none of the following has been run yet. You'll need:

- [Node.js 20+](https://nodejs.org/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase`, or via your package manager)
- A Supabase project (Settings → API for the URL/keys used below)

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

Run the unit tests (state machine, validation schemas, identifier
normalization — all pure functions, no live database needed):

```bash
npm test
```

## Migrations

SQL migrations live in `supabase/migrations/`, applied in filename order:

| File | Purpose |
|---|---|
| `0001_init_schema.sql` | Tables/enums from spec section 11 |
| `0002_rls_policies.sql` | Row Level Security (see below) |
| `0003_rate_limits.sql` | Backing store for join/response rate limiting |
| `0004_auth_user_provisioning.sql` | Auto-creates a `users` row for real (non-anonymous) sign-ins |
| `0005_realtime.sql` | Adds `session_participants`/`responses` to the Realtime publication |

Link the CLI to your project and push them:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

The `join-session` Edge Function needs its own secrets (never put these
in `.env`/`VITE_*` — they must not reach the browser):

```bash
supabase secrets set STUDENT_ID_HMAC_SECRET=$(openssl rand -hex 32)
supabase functions deploy join-session
```

## Deploying to Netlify

The repo includes `netlify.toml` (build command `npm run build`, publish
dir `dist`, SPA redirect so client-side routes survive a hard refresh).

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
   Netlify reads `netlify.toml` automatically — no manual build config needed.
3. Under **Site settings → Environment variables**, set `VITE_SUPABASE_URL`
   and `VITE_SUPABASE_ANON_KEY` (same values as your local `.env`).
4. Deploy. Until step 3 is done, the site still builds and loads, but
   shows a "Supabase project not connected" screen instead of the app
   (see `isSupabaseConfigured` in `src/lib/supabaseClient.ts`) — it
   fails clearly instead of crashing blank.

Netlify's own build servers run `npm install`/`npm run build` for you,
so this path doesn't require Node.js on your machine at all — only for
local development (`npm run dev`) would you need it installed.

## Environment variables

See `.env.example`. Frontend (`VITE_*`) vars are safe to expose (anon
key only, protected by RLS). `STUDENT_ID_HMAC_SECRET` and the service
role key are Edge Function secrets only.

## RLS model

Two browser-side identities ever hold a key:

- **Instructors** — real Supabase Auth users (email magic link here;
  swap in password/SSO as needed). `0004_auth_user_provisioning.sql`
  gives each one a `public.users` row on first sign-in.
- **Students** — Supabase **anonymous** auth sessions. They never see
  a service-role key; `join-session` (running as the service role)
  is the only thing that can hash identifiers, check the roster/code,
  and insert their `session_participants` row.

Policies (`0002_rls_policies.sql`) enforce, per spec section 21:

- A student can read/write only their own `responses`, gated additionally
  on the session being in a state that allows writes (`responses_open`
  or `join_closed`).
- A student can read only their own `session_participants` row — never
  another student's.
- `questions`/`question_options` are readable by a student only for the
  lesson behind a `class_session` they've already joined.
- Everything instructor-authored (`lessons`, `questions`,
  `presentation_scenes`, `student_roster`, …) is scoped to
  `course_members` of that course.
- `audit_events` has no client insert policy at all — only the service
  role writes audit rows, so the trail can't be forged from the browser.

## Creating a demo instructor

1. Run the app, go to `/studio`, enter your email — you'll get a
   Supabase magic link (make sure email sending is configured for your
   project, or read the link out of `supabase functions logs`/the
   dashboard's Auth logs in local dev).
2. Signing in creates your `public.users` row automatically (see
   `0004_auth_user_provisioning.sql`).
3. Create a course, then a lesson, then a few questions from `/studio`.

There's no seeded demo lesson with synthetic respondents yet — spec
section 27 calls for one (~200 synthetic respondents) to support
Presentation-mode and load-test development; that lands with Phase 2/5.

## Running load tests

Not implemented yet. The spec (sections 12, 20, 27) calls for a k6 or
Artillery script simulating 250 concurrent clients joining within 60s
and bursting 250 response writes within 20s, checked against the
error-rate and latency budgets in section 20. This is scoped to Phase 5
in section 25 and should live under `load-tests/` when it's built.

## What's deliberately not here yet

- Presentation Scenes / chartRegistry / Live Override (Phase 2–3)
- Outlier exclusion tooling (Phase 3)
- Rotating attendance codes + `Rotate now`, roster CSV import, audit UI (Phase 4)
- Load tests, reconnect-consistency handling, accessibility QA (Phase 5)
- Question option builder UI (choice questions currently need
  `question_options` rows inserted manually until that lands)
