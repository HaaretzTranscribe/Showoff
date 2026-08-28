// POST /functions/v1/attendance-submit — spec section 11.
//
// The only write path into attendance_records for students (spec
// section 10: "Students may insert attendance only through a narrowly
// scoped server-side endpoint"). Runs with the service role so it can
// write regardless of RLS; RLS only lets an authenticated instructor
// insert 'instructor_manual' rows directly (see 0002_rls_policies.sql).
//
// Students never sign in (spec: "students do not need accounts") — no
// Authorization header is required or checked here.
//
// Deliberately self-contained (no ../_shared imports): meant to be
// pasted as-is into the Supabase Dashboard's Edge Function editor,
// which may not support multi-file functions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Mirrors src/domain/validation.ts#normalizeName — keep both in sync.
function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeAttendanceCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

/**
 * Fixed-window rate limit backed by rate_limit_hits (spec section 10:
 * "reduce spam without intrusive tracking"). Not a queue or a
 * distributed limiter — good enough for a single-classroom-sized
 * burst, intentionally simple for Phase 1.
 */
async function checkRateLimit(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  opts: { maxHits: number; windowSeconds: number }
): Promise<{ allowed: boolean }> {
  const since = new Date(Date.now() - opts.windowSeconds * 1000).toISOString();
  const { count, error } = await admin
    .from("rate_limit_hits")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .gte("created_at", since);

  if (error) {
    // Fail open on infra errors rather than locking every student out of class.
    console.error("rate limit check failed", error);
    return { allowed: true };
  }

  if ((count ?? 0) >= opts.maxHits) {
    return { allowed: false };
  }

  await admin.from("rate_limit_hits").insert({ bucket });
  return { allowed: true };
}

const submitRequestSchema = z.object({
  sessionSlug: z.string().trim().min(1).max(80),
  fullName: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .refine((v) => /\p{L}/u.test(v), "name must contain a letter"),
  attendanceCode: z.string().trim().min(1).max(32),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let payload: z.infer<typeof submitRequestSchema>;
  try {
    const body = await req.json();
    payload = submitRequestSchema.parse(body);
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const forwardedFor = req.headers.get("x-forwarded-for") ?? "unknown";
  const clientIp = forwardedFor.split(",")[0].trim();

  const ipLimit = await checkRateLimit(admin, `attendance:ip:${clientIp}`, {
    maxHits: 12,
    windowSeconds: 60,
  });
  if (!ipLimit.allowed) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  const { data: session, error: sessionError } = await admin
    .from("class_sessions")
    .select("id, status, attendance_code, pollslive_join_url")
    .eq("session_slug", payload.sessionSlug)
    .maybeSingle();

  if (sessionError) {
    console.error("session lookup failed", sessionError);
    return jsonResponse({ error: "server_error" }, 500);
  }
  if (!session) {
    return jsonResponse({ error: "session_not_found" }, 404);
  }
  if (session.status === "draft") {
    return jsonResponse({ error: "session_not_open" }, 409);
  }
  if (session.status === "closed") {
    return jsonResponse({ error: "session_closed" }, 409);
  }

  if (normalizeAttendanceCode(session.attendance_code) !== normalizeAttendanceCode(payload.attendanceCode)) {
    return jsonResponse({ error: "invalid_code" }, 401);
  }

  const normalizedName = normalizeName(payload.fullName);

  const { data: existing, error: existingError } = await admin
    .from("attendance_records")
    .select("id")
    .eq("class_session_id", session.id)
    .eq("normalized_name", normalizedName)
    .maybeSingle();

  if (existingError) {
    console.error("attendance lookup failed", existingError);
    return jsonResponse({ error: "server_error" }, 500);
  }

  if (existing) {
    return jsonResponse({
      success: true,
      alreadyRecorded: true,
      continueUrl: session.pollslive_join_url,
    });
  }

  const { error: insertError } = await admin.from("attendance_records").insert({
    class_session_id: session.id,
    full_name: payload.fullName.trim(),
    normalized_name: normalizedName,
    source: "student",
  });

  if (insertError) {
    console.error("attendance insert failed", insertError);
    return jsonResponse({ error: "server_error" }, 500);
  }

  return jsonResponse({
    success: true,
    alreadyRecorded: false,
    continueUrl: session.pollslive_join_url,
  });
});
