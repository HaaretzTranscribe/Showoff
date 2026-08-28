import { supabase } from "@/lib/supabaseClient";
import type { PublicSessionInfo } from "@/domain/types";

/**
 * ShowOff no longer accepts an attendance write of its own — roll call
 * happens entirely in the embedded Google Form (see JoinPage). This
 * only reads the non-sensitive session info needed to render the join
 * page: course/date/status, the code to display, and the Form to
 * embed.
 */
export async function getPublicSessionInfo(
  sessionSlug: string
): Promise<PublicSessionInfo | null> {
  const { data, error } = await supabase
    .from("public_join_sessions")
    .select("session_slug, title, session_date, status, course_name, attendance_code, google_form_url")
    .eq("session_slug", sessionSlug)
    .maybeSingle();

  if (error || !data) return null;

  return {
    sessionSlug: data.session_slug,
    title: data.title,
    sessionDate: data.session_date,
    status: data.status,
    courseName: data.course_name,
    attendanceCode: data.attendance_code,
    googleFormUrl: data.google_form_url,
  };
}
