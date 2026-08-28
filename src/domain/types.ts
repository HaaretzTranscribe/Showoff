export type SessionStatus = "draft" | "open" | "closed";

export interface Course {
  id: string;
  ownerUserId: string;
  name: string;
  createdAt: string;
}

export interface ClassSession {
  id: string;
  courseId: string;
  title: string;
  sessionDate: string;
  sessionSlug: string;
  attendanceCode: string;
  /** Embed URL for this lesson's roll-call Google Form. */
  googleFormUrl: string | null;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Public, non-sensitive info shown on the join page. Includes the
 * attendance code and Form URL — both are meant to be shown to
 * whoever opens the join link, the same way the QR code itself is
 * already public. ShowOff never stores who actually attended; that
 * lives only in the Form's linked Google Sheet.
 */
export interface PublicSessionInfo {
  sessionSlug: string;
  title: string;
  sessionDate: string;
  status: SessionStatus;
  courseName: string;
  attendanceCode: string;
  googleFormUrl: string | null;
}
