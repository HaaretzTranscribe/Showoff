import { supabase } from "@/lib/supabaseClient";
import type { PublicSessionInfo } from "@/domain/types";

export interface AttendanceSubmitResult {
  success: boolean;
  alreadyRecorded: boolean;
  continueUrl: string;
}

export type AttendanceSubmitError =
  | "session_not_found"
  | "session_not_open"
  | "session_closed"
  | "invalid_code"
  | "rate_limited"
  | "invalid_request"
  | "server_error"
  | "network_error";

export async function getPublicSessionInfo(
  sessionSlug: string
): Promise<PublicSessionInfo | null> {
  const { data, error } = await supabase
    .from("public_join_sessions")
    .select("session_slug, title, session_date, status, course_name")
    .eq("session_slug", sessionSlug)
    .maybeSingle();

  if (error || !data) return null;

  return {
    sessionSlug: data.session_slug,
    title: data.title,
    sessionDate: data.session_date,
    status: data.status,
    courseName: data.course_name,
  };
}

export async function submitAttendance(input: {
  sessionSlug: string;
  fullName: string;
  attendanceCode: string;
}): Promise<
  { ok: true; data: AttendanceSubmitResult } | { ok: false; error: AttendanceSubmitError }
> {
  try {
    const { data, error } = await supabase.functions.invoke("attendance-submit", {
      body: input,
    });

    if (error) {
      const context = (error as { context?: Response }).context;
      if (context) {
        try {
          const body = await context.json();
          if (typeof body?.error === "string") {
            return { ok: false, error: body.error as AttendanceSubmitError };
          }
        } catch {
          // fall through to generic server_error below
        }
      }
      return { ok: false, error: "server_error" };
    }

    return { ok: true, data: data as AttendanceSubmitResult };
  } catch {
    return { ok: false, error: "network_error" };
  }
}
