export type SessionStatus = "draft" | "open" | "closed";

/**
 * One row of the published lessons Google Sheet that drives most of
 * the app — see src/lib/sheetSessions.ts and
 * docs/phase_1_addendum_no_backend.md. There is no database for this
 * part; it's the entire data model for attendance/join.
 */
export interface PublicSessionInfo {
  sessionSlug: string;
  courseName: string;
  title: string;
  sessionDate: string;
  attendanceCode: string;
  googleFormUrl: string | null;
  status: SessionStatus;
}

/**
 * One row of the published questions Google Sheet — a lesson's
 * pre-planned ordered list of question Forms. See src/lib/questions.ts.
 */
export interface QuestionInfo {
  lessonKey: string;
  questionNumber: string;
  title: string;
  googleFormUrl: string;
}

/**
 * The one piece of state that isn't in a Google Sheet: which question
 * (if any) is live right now for a lesson. Lives in Netlify Blobs via
 * the active-question Function — see docs/phase_2_addendum_live_questions.md.
 */
export interface ActiveQuestionState {
  formUrl: string;
  title: string | null;
  questionNumber: string | null;
}
