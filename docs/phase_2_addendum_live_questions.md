# Phase 2 addendum: live question orchestration

Phase 1 (see the Phase 1 docs) is a fully backend-free app driven by a
published Google Sheet. This is the first piece of Phase 2 — one
narrow slice: **the instructor clicks a question, every student
currently on `/live/:sessionSlug` sees that question's Google Form
appear automatically, no refresh.** Nothing else from Phase 2 (response
retrieval, Sheets aggregation, visualization, anonymous respondent
IDs, cross-question joins, charts) is built yet — this is scoped
strictly to delivery/orchestration of which Form is currently showing.

## Why this needed a backend after all

Two designs were tried and rejected before this one, in order:

1. **Supabase + Realtime** — rejected: reintroducing a full database
   and Realtime subscription felt heavier than this narrow feature
   needed.
2. **Extend the existing Google Sheet** (instructor pastes each
   question's Form URL into a cell, students poll it) — rejected:
   the instructor is lecturing and can't be editing a spreadsheet
   mid-class with the precision this needs.

What actually shipped: a **one-click instructor page**, backed by the
smallest possible bit of live state — a single Netlify Function +
Netlify Blobs (both already part of this project's existing Netlify
account; no new external service, matching the "preserve Netlify
compatibility" requirement). Planning content (which questions exist,
in what order, with which Form) still lives in a Google Sheet, exactly
like everything else in this app — only the single "what's live right
now" flag needed a real backend, because writing that from a browser
click can't safely go directly to a Google Sheet (no credentials
belong in client-side JS) and needs to reach other browsers
automatically.

## What was added

- **A second published Google Sheet (or a second tab of the same
  spreadsheet), for questions** — one row per question, columns:
  `lesson_number` (matches the lessons sheet's key), `question_number`
  (order), `title` (shown to the instructor only, never to students),
  `google_form_url`. Published to web as CSV, same as the lessons
  sheet, its URL goes in `VITE_QUESTIONS_SHEET_CSV_URL`. Planned once
  before the lecture, not touched during it.
- **`netlify/functions/active-question.mts`** — a Netlify Function
  (v2, using `config.path` for the clean `/api/active-question` URL).
  `GET ?lesson=<key>` returns the currently active question for that
  lesson (or `null`); `POST { lesson, formUrl, title, questionNumber
  }` sets it; `POST { lesson, formUrl: null }` clears it back to
  waiting. Backed by `@netlify/blobs`, one store (`active-questions`),
  keyed by lesson key.
- **`src/lib/questions.ts`** — fetches and parses the questions sheet,
  filtered/sorted for one lesson.
- **`src/lib/activeQuestion.ts`** — thin client for the Function
  (`getActiveQuestion`, `setActiveQuestion`).
- **`src/features/instructor/InstructorControlPage.tsx`**, mounted at
  `/control/:sessionSlug` — lists that lesson's questions as buttons
  plus a "Waiting / no active question" button; clicking one calls
  `setActiveQuestion`. The active one is visually highlighted
  (re-derived from a `GET` on load, then optimistically updated
  locally after each click — it doesn't poll itself, since only one
  instructor tab is expected to be open at a time).
- **`src/features/live/LiveSessionPage.tsx`** now polls
  `getActiveQuestion` every 3 seconds (`POLL_INTERVAL_MS`). No active
  question → the existing waiting screen. Active question → an
  embedded iframe of that Form, `key`ed by its URL so switching
  questions gives students a clean fresh load rather than an in-place
  navigation. The page itself never reloads or route-changes; only the
  iframe swaps.

## Access control — deliberately none, stated plainly

`/control/:sessionSlug` and the Function's `POST` have no
authentication. This matches the trust model already established for
the attendance code and the join link throughout Phase 1: the control
page isn't linked from anywhere a student would find it, so the only
protection is not knowing the URL. Anyone who did find it could change
what every student on that lesson sees. Given the stated scale (one
course, a handful of trusted staff), this was a deliberate choice, not
an oversight — but if this ever needs to survive a more adversarial
audience, that's the first thing to add (e.g. a shared secret header
checked in the Function, with the control page prompting for it once
and storing it locally).

## Known trade-offs

- **Up to ~3 seconds of lag** between an instructor's click and a
  student's screen updating, by design (the poll interval). This is
  not push/Realtime; it's short-interval polling. Fine for advancing
  through questions at lecture pace; not suitable for anything needing
  sub-second sync.
- **Blobs storage is unstructured and unaudited.** There's no history
  of what was active when — only the current value. If you need a
  record of question timing later, that's new scope, not covered here.
- **Local dev limitation:** `netlify/functions/` and Netlify Blobs
  only run under Netlify's own infrastructure (or `netlify dev`'s
  emulation) — plain `vite dev` serves the frontend fine but the
  `/api/active-question` calls will simply fail (network error,
  handled gracefully as "no active question"). Test this feature
  against a real Netlify deploy, not local `vite`.

## Privacy boundary — unaffected

Nothing here touches attendance or student identity. The active-
question state is just "which Form URL is currently showing," with no
student data anywhere in it.
