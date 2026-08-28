export type SessionStatus = "draft" | "open" | "closed";

export type AttendanceSource = "student" | "instructor_manual";

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
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  classSessionId: string;
  fullName: string;
  normalizedName: string;
  submittedAt: string;
  source: AttendanceSource;
}

/** Public, non-sensitive info shown on the join page before a student submits. */
export interface PublicSessionInfo {
  sessionSlug: string;
  title: string;
  sessionDate: string;
  status: SessionStatus;
  courseName: string;
}
