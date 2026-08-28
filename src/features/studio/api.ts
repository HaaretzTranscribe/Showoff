import { supabase } from "@/lib/supabaseClient";
import { normalizeName } from "@/domain/validation";
import { buildSessionSlug } from "@/lib/slug";
import type { AttendanceRecord, ClassSession, Course, SessionStatus } from "@/domain/types";

interface CourseRow {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
}

function mapCourse(row: CourseRow): Course {
  return { id: row.id, ownerUserId: row.owner_user_id, name: row.name, createdAt: row.created_at };
}

interface SessionRow {
  id: string;
  course_id: string;
  title: string;
  session_date: string;
  session_slug: string;
  attendance_code: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

function mapSession(row: SessionRow): ClassSession {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    sessionDate: row.session_date,
    sessionSlug: row.session_slug,
    attendanceCode: row.attendance_code,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface AttendanceRow {
  id: string;
  class_session_id: string;
  full_name: string;
  normalized_name: string;
  submitted_at: string;
  source: "student" | "instructor_manual";
}

function mapAttendance(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    classSessionId: row.class_session_id,
    fullName: row.full_name,
    normalizedName: row.normalized_name,
    submittedAt: row.submitted_at,
    source: row.source,
  };
}

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CourseRow[]).map(mapCourse);
}

export async function createCourse(ownerUserId: string, name: string): Promise<Course> {
  const { data, error } = await supabase
    .from("courses")
    .insert({ owner_user_id: ownerUserId, name })
    .select("*")
    .single();
  if (error) throw error;
  return mapCourse(data as CourseRow);
}

export async function getCourse(courseId: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCourse(data as CourseRow) : null;
}

export async function getSession(sessionId: string): Promise<ClassSession | null> {
  const { data, error } = await supabase
    .from("class_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSession(data as SessionRow) : null;
}

export async function listSessions(courseId: string): Promise<ClassSession[]> {
  const { data, error } = await supabase
    .from("class_sessions")
    .select("*")
    .eq("course_id", courseId)
    .order("session_date", { ascending: false });
  if (error) throw error;
  return (data as SessionRow[]).map(mapSession);
}

export async function createSession(input: {
  courseId: string;
  courseName: string;
  title: string;
  sessionDate: string;
  attendanceCode: string;
}): Promise<ClassSession> {
  const maxAttempts = 5;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const sessionSlug = buildSessionSlug(input.courseName, input.sessionDate);
    const { data, error } = await supabase
      .from("class_sessions")
      .insert({
        course_id: input.courseId,
        title: input.title,
        session_date: input.sessionDate,
        session_slug: sessionSlug,
        attendance_code: input.attendanceCode,
      })
      .select("*")
      .single();

    if (!error) return mapSession(data as SessionRow);

    lastError = error;
    if (error.code !== "23505") break; // not a unique-violation on the slug — don't retry
  }

  throw lastError;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<ClassSession> {
  const { data, error } = await supabase
    .from("class_sessions")
    .update({ status })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error) throw error;
  return mapSession(data as SessionRow);
}

export async function updateAttendanceCode(
  sessionId: string,
  attendanceCode: string
): Promise<ClassSession> {
  const { data, error } = await supabase
    .from("class_sessions")
    .update({ attendance_code: attendanceCode })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error) throw error;
  return mapSession(data as SessionRow);
}

export async function listAttendance(classSessionId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("class_session_id", classSessionId)
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return (data as AttendanceRow[]).map(mapAttendance);
}

export async function addManualAttendee(
  classSessionId: string,
  fullName: string
): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from("attendance_records")
    .insert({
      class_session_id: classSessionId,
      full_name: fullName.trim(),
      normalized_name: normalizeName(fullName),
      source: "instructor_manual",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapAttendance(data as AttendanceRow);
}

export async function removeAttendanceRecord(recordId: string): Promise<void> {
  const { error } = await supabase.from("attendance_records").delete().eq("id", recordId);
  if (error) throw error;
}

export function attendanceToCsv(records: AttendanceRecord[]): string {
  const header = "full_name,submitted_at,source";
  const rows = records.map((r) =>
    [r.fullName, r.submittedAt, r.source].map(csvEscape).join(",")
  );
  return [header, ...rows].join("\r\n");
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
