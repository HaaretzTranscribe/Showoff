# ShowOff — Spec 1: Student Attendance & Join Layer


## 0. Role in the Larger ShowOff Product

**This specification is Phase 1 of the larger ShowOff application. It is not a standalone project.**

A subsequent Claude Code session will extend this **same repository** with the instructor-facing PollsLive integration, live response ingestion, Presentation Scenes, and visualization/presentation system described in Spec 2.

Build Phase 1 with that future extension in mind.

Hard requirements:

- Work in the existing **ShowOff** repository and Netlify project.
- This Phase 1 implementation will become the foundation for Phase 2.
- Design shared infrastructure—database schema, instructor authentication, courses, class sessions, routing, i18n, environment-variable handling, shared types, and reusable UI/components—so it can be extended cleanly.
- Keep responsibilities modular. Attendance-specific logic should not be tightly coupled to future polling or visualization logic.
- Use stable IDs and sensible relational models for courses, lessons/sessions, and instructor ownership.
- Preserve a clear privacy boundary between named attendance data and the future anonymous PollsLive analytical dataset.
- Do **not** create any generic identity-mapping mechanism that a later phase might accidentally use to connect attendance names to PollsLive voter IDs.
- Do not implement PollsLive response ingestion, visualization, Presentation Scenes, or the instructor presentation system during this phase. Those belong to Spec 2.
- Do not over-engineer speculative Phase 2 functionality. Build only the shared foundations that naturally belong in Phase 1.
- When Phase 1 is complete, leave the repository in a clean, tested, deployable state so a fresh Claude Code session can inspect it and continue with Spec 2.

The intended development sequence is:

**Existing ShowOff → Spec 1 / Phase 1 → tested + committed → fresh Claude Code session → Spec 2 / Phase 2**

---

## Existing Project / Deployment Constraint

This project is called **ShowOff**.

There is already an existing **Netlify account / project foundation from the original ShowOff project**. Reuse that existing Netlify setup rather than creating a new hosting account or switching deployment providers.

Hard requirements:

- Project name: **ShowOff**
- Deployment target: **Netlify**
- Reuse the existing Netlify account/project foundation associated with the original ShowOff project.
- Do not migrate the project to Vercel.
- Preserve or reuse existing Netlify environment-variable management, deploy previews, domain configuration, and CI/CD conventions where practical.
- Before changing deployment configuration, inspect the existing ShowOff repository and Netlify configuration first.
- Prefer adapting the current `netlify.toml`, build settings, environment variables, redirects, and functions setup rather than replacing them wholesale.
- If the original ShowOff codebase already contains reusable auth, UI, Supabase, or deployment scaffolding, reuse it where sensible instead of rebuilding from scratch.


## 1. Purpose

Build a minimal student-facing web application for university classes.

The app has exactly two responsibilities:

1. Record named attendance at the beginning of class.
2. Hand the student off into the anonymous PollsLive session used for classroom questions.

The attendance system must never create or preserve a link between a student's real identity and their PollsLive respondent identity.

This is intentionally a thin system. Do not build a polling engine, question engine, visualization layer, or analytics dashboard here.

---

## 2. Core Student Flow

### Step 1 — Join
The instructor projects a QR code that points to a URL such as:

`https://<showoff-domain>/join/{sessionSlug}`

The student scans it on their phone.

### Step 2 — Attendance Form
Show:

- Course / class name
- Session date
- Full name
- Attendance code
- Submit button

Example:

> Data Storytelling  
> August 28, 2026  
>
> Full name: [________________]  
> Attendance code: [______]  
>
> [ Enter class ]

### Step 3 — Validate
On submit:

- Verify that the attendance session exists.
- Verify that the session is currently open.
- Verify that the submitted attendance code matches the current code configured for that session.
- Normalize the student's name.
- Prevent accidental duplicate submissions for the same name/session.
- Record attendance.

### Step 4 — Confirmation
Show:

> Attendance recorded ✓

Then show:

> [ Continue to class ]

### Step 5 — PollsLive Handoff
The Continue button sends the student to the PollsLive live-session join URL.

Important:

- Do not append the student's name.
- Do not append an internal student ID.
- Do not append an attendance record ID.
- Do not append any token that can later be mapped back to attendance.
- Do not set cross-system identifiers.

The handoff must deliberately break identity continuity.

---

## 3. Privacy Model

This is a hard product requirement.

There are two separate datasets.

### Dataset A — Attendance
Contains real names.

Example:

| session_id | full_name | submitted_at | status |
|---|---|---|---|
| 123 | David Cohen | 2026-08-28 09:03 | present |

### Dataset B — Poll Responses
Lives in PollsLive and is later consumed by the visualization application.

Example:

| voter_id | q1 | q2 | q3 |
|---|---|---|---|
| anon_8f3a | 2 | 47 | 18 |

There must be no field, token, cookie, URL parameter, database record, browser storage value, or server-side mapping that connects:

`David Cohen`

to:

`anon_8f3a`

The absence of this connection is intentional and must be preserved by design.

---

## 4. Instructor Controls Needed for Attendance

The instructor should be able to create/open a class attendance session from the main ShowOff instructor application.

Required session fields:

- Course name
- Session title
- Session date
- Attendance code
- PollsLive join URL
- Status:
  - draft
  - open
  - closed

The instructor must be able to:

- Open attendance
- Close attendance
- Change the attendance code
- See number of recorded attendees
- View attendance names
- Export attendance as CSV
- Manually add an attendee
- Remove an erroneous attendance record

The first version does not need rotating QR codes, geofencing, Bluetooth, Wi-Fi verification, GPS, or anti-cheating mechanisms beyond the attendance code.

---

## 5. Recommended Stack

First inspect the existing ShowOff repository before choosing or replacing framework pieces.

Preferred stack, if consistent with the existing project:

- Next.js
- TypeScript
- Supabase
  - Postgres
  - Auth for instructors only
  - Row Level Security
- Tailwind CSS
- shadcn/ui or equivalent
- **Netlify deployment**

Students do not need accounts.

If the existing ShowOff project already uses equivalent technologies, preserve them unless there is a strong technical reason not to.

---

## 6. Data Model

### courses

- id: uuid
- owner_user_id: uuid
- name: text
- created_at: timestamp

### class_sessions

- id: uuid
- course_id: uuid
- title: text
- session_date: date
- session_slug: text, unique
- attendance_code: text
- pollslive_join_url: text
- status: enum(draft, open, closed)
- created_at: timestamp
- updated_at: timestamp

### attendance_records

- id: uuid
- class_session_id: uuid
- full_name: text
- normalized_name: text
- submitted_at: timestamp
- source: enum(student, instructor_manual)

Do not add PollsLive voter IDs to this table.

Do not add a generic `external_user_id` field.

---

## 7. Duplicate Handling

Normalize name:

- trim
- collapse repeated whitespace
- case-insensitive comparison

If the same normalized name already exists in the same session:

- do not create a second record
- show "Attendance already recorded"
- still allow Continue to PollsLive

Do not attempt biometric or identity verification.

---

## 8. Student UX Requirements

Mobile-first.

Target:

- iPhone Safari
- Android Chrome

The entire interaction should normally require less than 20 seconds.

Requirements:

- Large inputs
- Large buttons
- Minimal text
- No account creation
- No email
- No password
- No navigation menu
- No unnecessary confirmation step

Error states:

- Wrong attendance code
- Session not yet open
- Session closed
- Duplicate attendance
- Temporary network/server error

---

## 9. Bilingual UI

Support:

- Hebrew
- English

Requirements:

- Hebrew RTL
- English LTR
- Language switch without losing form state
- Centralized i18n dictionary
- Do not duplicate pages

Default language may be configured per course/session.

---

## 10. Security

### Instructor side
Require authenticated instructor access.

### Student side
Public session route is allowed only when session is open.

Validate all attendance submissions server-side.

Rate-limit repeated submissions enough to reduce spam without intrusive tracking.

### Database
Use Row Level Security.

Students may insert attendance only through a narrowly scoped server-side endpoint. They must not have direct read access to the attendance table.

Only authorized instructors can read/export attendance names.

---

## 11. API Routes

Suggested:

### POST `/api/attendance/submit`

Input:

```json
{
  "sessionSlug": "data-storytelling-2026-08-28",
  "fullName": "David Cohen",
  "attendanceCode": "4821"
}
```

Returns:

```json
{
  "success": true,
  "alreadyRecorded": false,
  "continueUrl": "https://pollslive.com/..."
}
```

### GET `/api/instructor/sessions/{id}/attendance`

Instructor-authenticated.

### POST `/api/instructor/sessions/{id}/attendance/manual`

Instructor-authenticated.

### DELETE `/api/instructor/sessions/{id}/attendance/{recordId}`

Instructor-authenticated.

### GET `/api/instructor/sessions/{id}/attendance.csv`

Instructor-authenticated.

---

## 12. What NOT to Build

Do not build:

- Student accounts
- Student authentication
- Poll creation
- Poll answering
- Poll response storage
- Charts
- Data analysis
- PollsLive response ingestion
- Question sequencing
- Presentation scenes
- GPS attendance
- Rotating QR codes
- Device fingerprinting for identity
- Any mapping from attendance identity to PollsLive identity

---

## 13. Acceptance Criteria

Complete when:

1. Instructor creates a class session.
2. Instructor sets attendance code and PollsLive join URL.
3. Instructor opens attendance.
4. Student scans QR.
5. Student enters full name + correct code.
6. Attendance is saved.
7. Student sees confirmation.
8. Student taps Continue.
9. Student reaches PollsLive.
10. No identity information is passed to PollsLive.
11. Instructor can see/export attendance names.
12. Poll responses remain structurally disconnected from attendance records.
13. Works smoothly with at least 150 students opening/submitting during the same few minutes.
14. Deployed through the existing ShowOff Netlify setup.

---

## 14. Load Target

- 150 students simultaneously
- Test target: 250 concurrent attendance-page sessions
- Burst target: 150 submissions inside 60 seconds

No request should depend on sequential processing.

---

## 15. Definition of Done

For a student:

**Scan → Name + code → Attendance recorded → Continue → PollsLive**

For an instructor:

**Open attendance → watch count rise → close attendance → export names**

Nothing more.
