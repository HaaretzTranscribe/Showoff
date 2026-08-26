import { supabase } from "@/lib/supabaseClient";
import type { ClassSession } from "@/domain/types";
import { applyTransition } from "@/domain/sessionStateMachine";

// Excludes visually-confusing characters (spec section 5: "ללא תווים
// מבלבלים כגון O/0 או I/1").
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateStaticCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

interface ClassSessionRow {
  id: string;
  lesson_id: string;
  status: ClassSession["status"];
  opened_at: string | null;
  closed_at: string | null;
  code_policy: ClassSession["codePolicy"];
  current_code_version: number;
}

function mapClassSession(row: ClassSessionRow): ClassSession {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    codePolicy: row.code_policy,
    currentCodeVersion: row.current_code_version,
  };
}

/** Opens a fresh class_session for a lesson with a static attendance code (spec section 5). */
export async function openSession(lessonId: string): Promise<{ session: ClassSession; code: string }> {
  const status = applyTransition("draft", "OPEN_JOIN"); // -> "join_open", server-authoritative even here
  const code = generateStaticCode();

  const { data, error } = await supabase
    .from("class_sessions")
    .insert({
      lesson_id: lessonId,
      status,
      opened_at: new Date().toISOString(),
      code_policy: "static",
      current_code: code,
      current_code_version: 1,
      code_rotated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  return { session: mapClassSession(data as ClassSessionRow), code };
}

/** Transitions join_open -> responses_open (spec section 16) so students can start answering. */
export async function openResponses(classSessionId: string): Promise<ClassSession> {
  const nextStatus = applyTransition("join_open", "OPEN_RESPONSES");
  const { data, error } = await supabase
    .from("class_sessions")
    .update({ status: nextStatus })
    .eq("id", classSessionId)
    .select("*")
    .single();
  if (error) throw error;
  return mapClassSession(data as ClassSessionRow);
}

export async function listSessionsForLesson(lessonId: string): Promise<ClassSession[]> {
  const { data, error } = await supabase
    .from("class_sessions")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("opened_at", { ascending: false });
  if (error) throw error;
  return (data as ClassSessionRow[]).map(mapClassSession);
}
