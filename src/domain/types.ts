export type SessionStatus = "draft" | "open" | "closed";

/**
 * One row of the published Google Sheet that drives the whole app —
 * see src/lib/sheetSessions.ts and docs/phase_1_addendum_no_backend.md.
 * There is no database; this is the entire data model.
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
