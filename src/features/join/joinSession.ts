import { supabase } from "@/lib/supabaseClient";
import { ensureAnonymousSession } from "@/lib/studentAuth";

export interface JoinParams {
  sessionId?: string;
  lessonJoinSlug?: string;
  studentIdentifier: string;
  attendanceCode: string;
}

export interface JoinResult {
  participantId: string;
  classSessionId: string;
  status: string;
}

export class JoinError extends Error {
  constructor(public code: "auth_required" | "join_failed" | "invalid_request" | "unknown") {
    super(code);
  }
}

export async function joinSession(params: JoinParams): Promise<JoinResult> {
  await ensureAnonymousSession();

  const { data, error } = await supabase.functions.invoke<JoinResult>("join-session", {
    body: params,
  });

  if (error) {
    // supabase-js surfaces a non-2xx Edge Function response as
    // FunctionsHttpError with the raw Response on `.context`; the
    // actual { error: "..." } body has to be read out of it.
    const context = (error as { context?: Response }).context;
    let code: string | undefined;
    try {
      const body = await context?.json();
      code = body?.error;
    } catch {
      // context wasn't JSON (network failure, CORS, etc.) — fall through to "unknown"
    }
    if (code === "auth_required" || code === "join_failed" || code === "invalid_request") {
      throw new JoinError(code);
    }
    throw new JoinError("unknown");
  }
  if (!data) {
    throw new JoinError("unknown");
  }
  return data;
}
