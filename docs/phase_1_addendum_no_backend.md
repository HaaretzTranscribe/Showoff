# Phase 1 addendum: no backend at all — a published Google Sheet drives the app

This supersedes [`phase_1_addendum_google_form_rollcall.md`](./phase_1_addendum_google_form_rollcall.md)'s
assumption that Supabase still holds courses/sessions, and supersedes
whatever's left of
[`ShowOff_spec_1_attendance_join.md`](./ShowOff_spec_1_attendance_join.md)
sections 4 (instructor Studio), 5 (Supabase in the stack), 6 (the
`courses`/`class_sessions` tables), and 10 (RLS) — this app has no
database, no instructor auth, and no backend of any kind.

## What changed and why

Once roll call moved to an embedded Google Form
([`phase_1_addendum_google_form_rollcall.md`](./phase_1_addendum_google_form_rollcall.md)),
Supabase's only remaining job was a tiny, rarely-written table — course
name, lesson title/date, code, Form URL, open/closed — read by one
public query. For a single course with three trusted editors, that's
small enough to just be another Google Sheet, so it is: a
**published-to-web CSV** that ShowOff fetches directly from the
browser. There is no server, no auth, no database, no RLS.

## What was removed

- `supabase/` entirely (all migrations, the Edge Function, the linked
  project reference).
- `src/lib/supabaseClient.ts`, `src/features/auth/` (magic-link sign-in),
  `src/features/studio/` (the courses/sessions CRUD UI) — there's
  nothing left to authenticate into or manage through a UI. Course
  staff edit the Sheet directly in Google Sheets.
- `src/domain/validation.ts` and its test file, `src/lib/slug.ts`,
  `src/lib/errorMessage.ts` — all existed to support Supabase writes
  (session creation forms, slug/code generation, Supabase error
  formatting) that no longer happen in this app.
- The `@supabase/supabase-js` and `zod` dependencies.

## What was added

- `src/lib/csv.ts` — a small dependency-free CSV parser (quoted
  fields, escaped quotes, commas/newlines inside quotes), plus
  `parseCsvRecords` which turns a header row + data rows into objects
  keyed by normalized header name.
- `src/lib/sheetSessions.ts` — fetches
  `VITE_SESSIONS_SHEET_CSV_URL` with `cache: "no-store"` and finds the
  row matching a given `session_slug`. This is the entire data layer
  now: one function, one fetch, no auth.
- `PublicSessionInfo` in `src/domain/types.ts` is now the *only*
  domain type in the app.

## The Sheet's contract

One spreadsheet, one tab, one row per lesson. Column headers are
matched case-insensitively with spaces/punctuation normalized to `_`,
so "Course Name", "course_name", and "Course-Name" all work the same:

| Column (any of these spellings) | Meaning |
|---|---|
| `session_slug` / `slug` | The `/join/<this>` URL segment — must be unique, URL-safe, and is typed by hand |
| `course_name` / `course` | Shown to the student |
| `session_title` / `title` / `lesson_title` | Shown to the student |
| `session_date` / `date` | Shown to the student (any human-readable string is fine — it's not parsed for logic) |
| `attendance_code` / `code` | Shown large on the join page; **not validated by ShowOff or the Form** — course staff cross-check it against the Form response timestamps by hand |
| `google_form_url` / `form_url` | Embedded as the roll-call iframe |
| `status` | `draft`, `open`, or `closed` (anything else is treated as `draft`) — this is how attendance gets "opened"/"closed" now: edit the cell |

To publish: **File → Share → Publish to web**, choose the specific
sheet/tab, format **CSV**, and use that URL (not a plain "Share" link)
for `VITE_SESSIONS_SHEET_CSV_URL` — the publish-to-web endpoint is the
one that reliably supports anonymous cross-origin fetches from the
browser; a regular Drive "share" export URL may hit CORS or auth
issues.

## Known trade-offs, stated plainly

- **Propagation delay.** Google's publish-to-web CSV can lag a couple
  of minutes behind an edit (on top of the `no-store` fetch already
  avoiding *this app's* caching). Flip "open" a couple of minutes
  before class, not at the exact second.
- **No validation.** A typo'd status value, a malformed Form URL, a
  duplicate slug — nothing catches these before they reach students.
  Three trusted editors on one sheet is an acceptable bet against
  that; this would not scale past that.
- **No live push.** The join and live-session pages fetch on load, not
  on a subscription — a student already on the page won't see a
  same-second status flip without a refresh. Phase 2's real-time
  question-switching (see the other addendum) will need an actual push
  mechanism if it wants same-second updates; a CSV poll is likely
  insufficient there and should be reconsidered at that point.

## Privacy boundary — still the same, still trivially true

ShowOff holds no data about students at all now — not even the
config layer touches a name. The privacy requirement from spec section
3 (no field anywhere joining a named attendee to a future anonymous
response) is automatically satisfied by having nothing to join.
