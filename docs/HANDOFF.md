# ShowOff — session handoff (2026-08-28)

Start here in a fresh session. This is a point-in-time orientation
doc, not a permanent architecture record — for the detailed "why" of
each decision, read the docs it links to. Update or superscede this
file at the end of a future session rather than trusting it blindly
once time has passed; check live state (the Sheets, the deployed site)
before acting on anything here.

## What ShowOff is, right now

A live classroom tool for a "Data Storytelling" course, in active use
— real students are submitting real responses as of this handoff.
Three parts:

1. **Attendance/roll-call** (Phase 1) — student scans a QR code, sees
   a Google Form embedded in the page, fills in name/email/a code
   announced in class, continues to a waiting page.
2. **Live question orchestration** (Phase 2a) — instructor clicks a
   question on an unlisted control page; every student's waiting page
   automatically shows that question's Google Form, no refresh.
3. **Presentation visualizations** (Phase 2b) — instructor opens
   per-question chart pages (bar/big-number/scatter/text) built from
   real response data, self-updating every 5 minutes, meant for their
   own screen/slides — nothing pushed to students.

**Architecture in one sentence:** almost entirely backend-free —
everything lives in published Google Sheets fetched as CSV from the
browser — except one small Netlify Function + Netlify Blobs for the
single piece of state that genuinely needs live push (which question
is active right now).

Read, in this order, for the full reasoning behind each pivot:
[`README.md`](../README.md) (current architecture summary) →
[`ShowOff_spec_1_attendance_join.md`](./ShowOff_spec_1_attendance_join.md) (original spec, largely superseded) →
[`phase_1_addendum_live_session.md`](./phase_1_addendum_live_session.md) →
[`phase_1_addendum_google_form_rollcall.md`](./phase_1_addendum_google_form_rollcall.md) →
[`phase_1_addendum_no_backend.md`](./phase_1_addendum_no_backend.md) →
[`phase_2_addendum_live_questions.md`](./phase_2_addendum_live_questions.md) →
[`phase_2_addendum_visualizations.md`](./phase_2_addendum_visualizations.md).
Each addendum explicitly states what it supersedes — don't assume the
original spec still holds for anything an addendum touches.

## Live deployment

- **Site:** https://showoff-runi.netlify.app
- **Netlify site name:** `showoff-runi`, site ID `bfdf7f52-9b9a-4871-90e8-c030783f8092`
- **GitHub:** https://github.com/HaaretzTranscribe/Showoff (branch `main`, auto-deploy is *not* reliably wired — deploys were triggered manually via `netlify-cli api createSiteBuild` after each push in this session; check whether that's still necessary or whether continuous deployment has since been configured)
- **Node/npm** aren't on PATH in this dev environment — use
  `C:\Program Files\nodejs\node.exe` / `npm.cmd` directly, or prepend
  `$env:PATH = "C:\Program Files\nodejs;$env:PATH"` in PowerShell.
  Netlify CLI (`npx netlify-cli ...`) is already authenticated on this
  machine.

### Environment variables (set on Netlify, not in git)

| Var | Value (as of this handoff) |
|---|---|
| `VITE_SESSIONS_SHEET_CSV_URL` | `https://docs.google.com/spreadsheets/d/e/2PACX-1vRshxAgqvrcyBk-GYsnebq0TYpdqiFvQVekj7UO4WNwJbx6Pu_VkbLIRy7r-C3y7v1olDA_p8efNjrI/pub?output=csv` (Lessons tab) |
| `VITE_QUESTIONS_SHEET_CSV_URL` | same publish ID, `?gid=9813026&single=true&output=csv` (Questions tab) |

Both are published-to-web CSV links from the **same spreadsheet**
("DST2627"), different tabs. Verify current values with
`npx netlify-cli env:get <NAME>` rather than trusting this table if
much time has passed — they get replaced whenever the instructor
re-publishes a sheet.

## Routes

| Route | Audience | Purpose |
|---|---|---|
| `/` | anyone | minimal "scan your QR code" placeholder |
| `/join/:sessionSlug` | student | roll-call Form embed → Continue |
| `/live/:sessionSlug` | student | waiting screen ↔ active question Form (polls every 3s) |
| `/control/:sessionSlug` | instructor, unlisted | click a question to make it live |
| `/present/:sessionSlug/:vizId` | instructor, unlisted | one chart, `vizId` 1-11 for lesson 1 (self-refreshes every 5 min) |

`:sessionSlug` is usually a `lesson_number` (`1`-`12`, `1e`-`12e` for
parallel Hebrew/English tracks), not a random slug.

## The two Google Sheets ("DST2627" spreadsheet)

**Lessons tab** — one row per lesson: `lesson_number`, `session_slug`
(optional override), `course_name`, `session_title`, `session_date`,
`attendance_code` (shown only on the instructor's slideshow, never on
the join page — see the no-backend addendum for why), `google_form_url`
(roll-call Form), `status` (`draft`/`open`/`closed`).

**Questions tab** — one row per question: `lesson_number`,
`question_number`, `title` (instructor-facing only), `google_form_url`
(that question's Form), `responses_csv_url` (that question's Form
response Sheet, published to web as CSV — **not** the same as
`google_form_url`).

**As of this handoff, only lesson 1 has real content**: 5 questions
(Q1-Q5), each with real response data. Lessons 2-12/1e-12e exist as
skeleton rows (`lesson_number` only) with no course/title/code/Form
set up yet.

### Publishing gotchas (learned the hard way this session)

- **"Share" ≠ "Publish to web."** A regular share link (even "Anyone
  with the link can view") lets a server-side `curl` read the CSV
  export, but that endpoint has no `Access-Control-Allow-Origin`
  header — a real browser's `fetch()` is silently blocked by CORS.
  Only **File → Share → Publish to web** produces a URL with the
  right CORS header. This bit us twice; if a sheet "isn't updating"
  and the CSV genuinely looks stale/unreachable from the app, check
  this first.
- **`/pubhtml` vs `/pub?output=csv`.** Google's publish dialog
  sometimes hands back a `/pubhtml` link (an HTML preview page) even
  when CSV was selected. `src/lib/googleSheetUrl.ts#toCsvUrl` rewrites
  this automatically, so a pasted `pubhtml` link still works — don't
  make the instructor re-publish for this specific case.

## Live question state (the one real backend)

`netlify/functions/active-question.mts` (`config.path = "/api/active-question"`),
backed by Netlify Blobs, store name `active-questions`, keyed by
lesson key. `GET ?lesson=<key>` reads, `POST { lesson, formUrl, title,
questionNumber }` sets it, `POST { lesson, formUrl: null }` clears it.
**No authentication** — `/control/:sessionSlug` is unlisted-URL-only
security, same trust model as the attendance code. Stated explicitly
as a deliberate choice, not an oversight; first thing to add if this
ever needs to survive a more adversarial audience.

Doesn't run under plain `vite dev` — Functions/Blobs need real Netlify
infra (or `netlify dev`, untested this session). Verification this
session was done by deploying and testing against the live site with
two browser tabs (instructor + student).

## The 11 lesson-1 visualizations

Hand-written per lesson in `src/features/present/lesson1Visualizations.ts`
+ a small registry in `PresentationPage.tsx` — **deliberately not** a
generic sheet-driven chart engine (see the visualizations addendum for
why). Response CSVs are parsed **positionally** (column 0 = Timestamp,
then in Form-field order), not by header name, because Google's CSV
header is the literal Hebrew question text and the existing
`parseCsvRecords` normalizer would collapse every Hebrew column to an
empty key.

| # | Reads | Shows |
|---|---|---|
| 1 | Q1 | Yes/No, % of respondents |
| 2 | Q2 | 4-point satisfaction scale, % of respondents |
| 3 | Q2 | collapsed to positive (top 2 levels) vs negative (bottom 2), % |
| 4 | Q3 | transport method, % of respondents |
| 5 | Q3 | % dissatisfied per transport method |
| 6 | Q4 | mean monthly cost (₪), big number |
| 7 | Q4 | median monthly cost (₪), big number |
| 8 | Q4 | median commute time, big number |
| 9 | Q4 | % dissatisfied per time quartile, **labeled with each quartile's actual time range** (e.g. "רבעון 1 (1-12 דקות)") |
| 10 | Q4 | time-vs-cost scatter, 3-color by satisfaction (blue=very satisfied, red=very dissatisfied, purple=both middle levels); **excludes the single highest-time and single lowest-time response** |
| 11 | Q5 | 3 most recent "very dissatisfied" free-text experiences, black screen / big red text, most-recent-first with fallback to the next-worst level if fewer than 3 exist; trailing "." stripped from each quote |

Two explicit assumptions made this session that were never fully
confirmed — revisit if they turn out wrong:

- Viz 10 excludes outliers **by time**, not by cost. The instructor's
  phrasing ("should not include the highest and lowest number") didn't
  specify which axis; time was chosen since it's the axis emphasized
  in vizzes 8/9 too.
- Viz 9's quartiles split by **response count** (each bucket has
  roughly equal N), not by fixed time ranges. With few responses this
  can look uneven.

### Real bugs found and fixed this session (don't reintroduce)

- Recharts' own bar/scatter animation (`isAnimationActive` default)
  got stuck in an inactive state against sparse data and rendered
  **neither the bar shape nor its value label** — confirmed by
  inspecting the SVG directly (0 `<rect>`/`<path>` elements). Fixed by
  disabling Recharts' animation and doing the "grow upward" effect in
  pure CSS instead (`.chart-bars-animated` class in `index.css`,
  targets `.recharts-bar-rectangle path`). If ever re-enabling
  Recharts' native animation, test thoroughly against 1-2 data points
  first — that's what surfaced this.
- Bar value labels needed a custom render-prop on `<Bar label={...}>`
  — `<LabelList>` as a child silently failed to mount at all (0 found
  in the DOM), for reasons not fully diagnosed.
- **Known, not fixed:** a bar with value exactly 0 still renders no
  visible bar or label at all (Recharts skips zero-height geometry).
  Narrow edge case, documented, not chased further.

## What's explicitly out of scope / not built

- Response retrieval/visualization for any lesson other than lesson 1
  — each future lesson needs its own Questions-sheet rows *and* its
  own registry entries in `PresentationPage.tsx` (this is intentional,
  not a TODO to "generalize" without being asked).
- Anonymous respondent IDs, cross-question joins beyond what's listed
  above, a general no-code visualization builder.
- A QR-code generator page (offered, instructor said "later").
- An index page listing all 11 `/present` URLs (offered, not
  confirmed — currently the instructor just navigates directly; ask
  before building).
- Auth of any kind, anywhere in this app. Every instructor-facing page
  is "unlisted URL" security only. This is a repeated, deliberate
  choice — don't add auth unprompted.

## Before touching anything

1. Check current Sheet contents directly (`curl` the CSV URLs above)
   rather than trusting this doc's data snapshot — lesson 1 already
   has real, growing response data, and other lessons may have been
   filled in since.
2. Check `npx netlify-cli env:list` for current env var values before
   assuming the table above is still accurate.
3. This is a live tool with an active class using it — treat deploys
   during class hours with more caution than usual; verify locally
   (`npm run build`, `npm test`) before pushing, and confirm the
   specific thing you changed on the live site immediately after
   deploying, the way this session did throughout.
