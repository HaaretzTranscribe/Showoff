# Phase 2 addendum: presentation visualizations

Second slice of Phase 2 (after live question orchestration, see
[`phase_2_addendum_live_questions.md`](./phase_2_addendum_live_questions.md)):
per-question charts the instructor opens on their own laptop/projector
(put the link directly in your slides), self-refreshing every 5
minutes against real response data. Explicitly **not** included yet,
per the original scope restriction: anonymous respondent IDs,
cross-question joins beyond what's described below, a general
no-code visualization builder, or anything for lessons other than
lesson 1.

## Who sees this, and how it updates

Purely instructor-facing — nothing here is pushed to students'
`/live` pages. Each visualization is its own URL,
`/present/<lesson>/<vizId>`, meant to be opened *before* class (in a
tab, or linked from your slides) and left open; it re-fetches and
re-renders itself every 5 minutes, plus a manual "Refresh now" button
for a fresher pull right when you reach that point in the lecture.
This matches the propagation delay Google's own publish-to-web CSVs
already have — polling faster wouldn't get you materially fresher
data.

## Why this isn't a generic sheet-driven engine

The 11 visualizations for lesson 1 were specified individually, each
with its own aggregation logic (collapsing 4-point scales to
positive/negative, cross-referencing satisfaction against transport
method, quartile-bucketing a numeric field, a 3-way color-coded
scatter, a "3 worst, most-recent-first with fallback" text selector).
Trying to make all of that declaratively configurable from a
spreadsheet would be a large, premature investment for content that's
explicitly expected to differ every lesson. Instead:

- `src/features/present/lesson1Visualizations.ts` — bespoke,
  hand-written aggregation functions for exactly lesson 1's 11 cases.
- `src/features/present/PresentationPage.tsx` — a small
  `VIZ_META` registry (which question each `vizId` reads from, and its
  title) plus a switch statement choosing which aggregation + chart to
  render.

Future lessons get their own registry entries and aggregation
functions as their actual visualization needs become concrete — this
is a deliberate "build what's needed, not a platform" choice,
consistent with the rest of this app.

## The Sheet's contract (addition)

The Questions sheet gained one column: `responses_csv_url` — each
question's own Form response Sheet, published to web as CSV (same
steps as everywhere else: link the Form's responses to a Sheet, **File
→ Share → Publish to web**, pick the tab, CSV, publish, paste the
link).

Two robustness notes learned while setting this up:

- A **regular share link** ("Anyone with the link can view/edit") is
  *not* sufficient — `/export?format=csv` works from a server (curl)
  but has no `Access-Control-Allow-Origin` header, so a real browser's
  `fetch()` is silently blocked by CORS. Only the dedicated **Publish
  to web** endpoint sends that header. Use Publish to web, not Share.
- Google's Publish-to-web dialog sometimes hands back a `/pubhtml`
  link (an HTML preview page) even when CSV was selected.
  `src/lib/googleSheetUrl.ts#toCsvUrl` rewrites any `/pubhtml` link to
  `/pub?output=csv` automatically, so a pasted `pubhtml` link still
  works without another round of "please re-publish."

## Lesson 1's actual field layout

Response CSVs are parsed **positionally** (`src/lib/responses.ts`),
not by matching header text — Google Forms' CSV header is the literal
Hebrew question text, and the existing `parseCsvRecords` header
normalizer strips non-ASCII characters, which would collapse every
Hebrew column to the same empty key. Column 0 is always `Timestamp`.

| Question | Columns (after Timestamp) |
|---|---|
| Q1 | satisfaction (כן/לא) |
| Q2 | satisfaction (4-point scale) |
| Q3 | satisfaction (4-point), transport method |
| Q4 | satisfaction (4-point), method, monthly cost (₪, free text), minutes per trip (free text) |
| Q5 | satisfaction (4-point), one-sentence experience (free text), method, cost, time |

Cost/time are free-text Form fields (no numeric validation in the
Form itself), so `parseLenientNumber` extracts the first number-like
substring and silently skips rows where nothing parses, rather than
crashing on stray text.

## The 11 visualizations and their assumptions

| # | Question | Chart | Logic |
|---|---|---|---|
| 1 | Q1 | Bar | Raw Yes/No counts |
| 2 | Q2 | Bar | Raw 4-point scale counts |
| 3 | Q2 | Bar | Top 2 levels = "positive," bottom 2 = "negative" |
| 4 | Q3 | Bar | Raw transport-method counts |
| 5 | Q3 | Bar (%) | % of each method's respondents in the bottom 2 satisfaction levels |
| 6 | Q4 | Big number | Mean monthly cost |
| 7 | Q4 | Big number | Median monthly cost |
| 8 | Q4 | Big number | Median commute time |
| 9 | Q4 | Bar (%) | Split respondents into 4 equal-sized groups by commute time (fastest→slowest quartile), % in bottom 2 satisfaction levels per group |
| 10 | Q4 | Scatter | x = time, y = cost; blue = "very satisfied" only, red = "not satisfied at all" only, purple = **both** middle levels |
| 11 | Q5 | Black screen, red text | 3 most recent free-text responses among "not satisfied at all"; if fewer than 3 exist, fills remaining slots from "not so satisfied," most recent first. "Most recent" = last rows in the CSV (Forms appends new responses at the bottom) — timestamps are not parsed |

All of these were confirmed against the instructor in chat before
building; if a future lesson needs different collapsing/bucketing
rules, don't assume these generalize — ask again, the same way.

## Known trade-offs

- **Zero-value bars don't render.** Recharts skips generating any
  geometry for a bar whose value is exactly 0, so a 0%/0-count result
  shows as a blank gap with no bar and no label, rather than a visible
  "0%" bar. Ran into this via `viz3`/`viz5` with sparse test data (a
  bar-chart animation bug in a different area — see below — led to
  discovering this one too). Not fixed; revisit if a real class result
  lands on exactly zero for a category and that reads as "missing
  data" rather than "zero."
- **Recharts' built-in bar/scatter animation gets stuck.** `isAnimationActive`
  was disabled on `Bar` and `Scatter` after testing showed the
  animated version could render an empty chart — no bar geometry, no
  value label — seemingly because the `react-smooth` animation state
  never reached "active." Charts now render instantly (no grow/fade
  animation on the marks themselves) with a CSS `fade-in` on the whole
  chart container instead, which is reliable. If revisiting this,
  test thoroughly with sparse data (1-2 points) before re-enabling —
  that's what surfaced the bug.

- Same 5-minute-poll trade-off as the rest of Phase 2's realtime
  pieces: not push, not instant.
- `viz9`'s quartile split is by **response count**, not by fixed time
  ranges (e.g. not "0-15 / 15-30 / 30-45 / 45+ minutes") — with few
  responses this can produce uneven-looking groups. Revisit if that
  matters pedagogically.
- No caching/memoization between the 11 pages — if you have all 11
  tabs open, that's up to 5 separate response-sheet fetches every 5
  minutes (Q1-Q5, since several vizzes share a question). Fine at this
  scale; would need consolidating if this pattern scales to many more
  questions per lesson.

## Privacy boundary — unaffected

Response data here is exactly what students already submitted
anonymously into a Form with no name field (Q2-Q5 have no name/email
question at all; only the roll-call Form does, and that's a
completely separate Form/Sheet). Nothing in this feature adds a way to
connect a visualization's data point back to an attendance record.
