// POST /functions/v1/join-session — spec section 14 (Join API).
//
// Runs with the service role because it must: hash the raw student
// identifier before it ever touches a table a browser can read, check
// the roster, validate the attendance code + TTL, apply rate limits,
// and write session_participants (which the RLS policies in
// 0002_rls_policies.sql deliberately do not let clients insert
// directly). The caller must already hold a Supabase anonymous-auth
// JWT (spec 13.2: "Supabase anonymous sign-in ליצירת auth session
// טכנית לכל browser, ואז server-side join flow").
//
// Every failure path returns the same generic error — this endpoint
// must not let an attacker enumerate roster membership (spec 21).
//
// Deliberately self-contained (no ../_shared imports): this file is
// meant to be pasted as-is into the Supabase Dashboard's Edge Function
// editor, which may not support multi-file functions.

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

function normalizeIdentifier(raw: string): string {
  const stripped = raw.trim().replace(/[\s.\-]/g, "");
  if (/^\d+$/.test(stripped)) {
    return stripped.padStart(9, "0");
  }
  return stripped.toUpperCase();
}

/** HMAC-SHA256(normalized identifier, server secret), hex-encoded (spec section 13.2). */
async function hashIdentifier(normalized: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Fixed-window rate limit backed by rate_limit_hits (spec section 21:
 * "Rate limit ל־join attempts ו־response spam"). Not a queue or a
 * distributed limiter — good enough for a single-classroom-sized burst,
 * intentionally simple for Phase 1.
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

const joinRequestSchema = z
  .object({
    sessionId: z.string().uuid().optional(),
    lessonJoinSlug: z.string().min(1).max(64).optional(),
    studentIdentifier: z.string().min(1).max(64),
    attendanceCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{4,8}$/),
    clientFingerprint: z.string().max(256).optional(),
  })
  .refine((v) => Boolean(v.sessionId || v.lessonJoinSlug), {
    message: "either sessionId or lessonJoinSlug is required",
  });

const JOIN_ALLOWED_STATES = new Set(["join_open", "responses_open"]);

function genericFailure(): Response {
  // Same shape/status for "bad code", "not in roster", "session closed" —
  // never reveal which one it was.
  return jsonResponse({ error: "join_failed" }, 401);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const hmacSecret = Deno.env.get("STUDENT_ID_HMAC_SECRET")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerAuth, error: callerAuthError } = await callerClient.auth.getUser();
  if (callerAuthError || !callerAuth?.user) {
    // No/invalid anonymous session — client must sign in anonymously first.
    return jsonResponse({ error: "auth_required" }, 401);
  }
  const callerUserId = callerAuth.user.id;

  let payload: z.infer<typeof joinRequestSchema>;
  try {
    const body = await req.json();
    payload = joinRequestSchema.parse(body);
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const forwardedFor = req.headers.get("x-forwarded-for") ?? "unknown";
  const clientIp = forwardedFor.split(",")[0].trim();

  const ipLimit = await checkRateLimit(admin, `join:ip:${clientIp}`, {
    maxHits: 20,
    windowSeconds: 60,
  });
  if (!ipLimit.allowed) {
    return genericFailure();
  }

  const normalizedIdentifier = normalizeIdentifier(payload.studentIdentifier);
  const studentKeyHash = await hashIdentifier(normalizedIdentifier, hmacSecret);

  const identifierLimit = await checkRateLimit(admin, `join:identifier:${studentKeyHash}`, {
    maxHits: 10,
    windowSeconds: 60,
  });
  if (!identifierLimit.allowed) {
    return genericFailure();
  }

  // --- Resolve the target class_session ---
  let classSession: { id: string; lesson_id: string; status: string; current_code: string | null; code_policy: string; code_rotated_at: string | null } | null =
    null;

  if (payload.sessionId) {
    const { data } = await admin
      .from("class_sessions")
      .select("id, lesson_id, status, current_code, code_policy, code_rotated_at")
      .eq("id", payload.sessionId)
      .maybeSingle();
    classSession = data;
  } else if (payload.lessonJoinSlug) {
    const { data: lesson } = await admin
      .from("lessons")
      .select("id")
      .eq("join_slug", payload.lessonJoinSlug)
      .maybeSingle();
    if (lesson) {
      const { data } = await admin
        .from("class_sessions")
        .select("id, lesson_id, status, current_code, code_policy, code_rotated_at")
        .eq("lesson_id", lesson.id)
        .in("status", ["join_open", "responses_open"])
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      classSession = data;
    }
  }

  if (!classSession || !JOIN_ALLOWED_STATES.has(classSession.status)) {
    await logAudit(admin, "student", classSession?.id ?? null, "join_rejected", {
      reason: "session_not_open",
    });
    return genericFailure();
  }

  // --- Validate attendance code (+ TTL for rotating codes) ---
  if (!classSession.current_code || classSession.current_code !== payload.attendanceCode) {
    await logAudit(admin, "student", classSession.id, "join_rejected", { reason: "bad_code" });
    return genericFailure();
  }
  if (classSession.code_policy === "rotating") {
    const { data: lesson } = await admin
      .from("lessons")
      .select("config_json")
      .eq("id", classSession.lesson_id)
      .maybeSingle();
    const ttlSeconds = lesson?.config_json?.rotatingCodeTtlSeconds ?? 600;
    const rotatedAt = classSession.code_rotated_at ? new Date(classSession.code_rotated_at).getTime() : 0;
    if (Date.now() - rotatedAt > ttlSeconds * 1000) {
      await logAudit(admin, "student", classSession.id, "join_rejected", { reason: "code_expired" });
      return genericFailure();
    }
  }

  // --- Roster check ---
  const { data: lessonRow } = await admin
    .from("lessons")
    .select("course_id, config_json")
    .eq("id", classSession.lesson_id)
    .maybeSingle();
  const rosterPolicy = lessonRow?.config_json?.rosterPolicy ?? "off";

  if (rosterPolicy === "required") {
    const { data: rosterEntry } = await admin
      .from("student_roster")
      .select("id")
      .eq("course_id", lessonRow!.course_id)
      .eq("student_key_hash", studentKeyHash)
      .maybeSingle();
    if (!rosterEntry) {
      await logAudit(admin, "student", classSession.id, "join_rejected", { reason: "not_in_roster" });
      return genericFailure();
    }
  }

  // --- Create/refresh the participant (idempotent: same identifier + session -> same row) ---
  const { data: participant, error: upsertError } = await admin
    .from("session_participants")
    .upsert(
      {
        class_session_id: classSession.id,
        student_key_hash: studentKeyHash,
        auth_user_id: callerUserId,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "class_session_id,student_key_hash" }
    )
    .select("id")
    .single();

  if (upsertError || !participant) {
    console.error("join upsert failed", upsertError);
    return genericFailure();
  }

  await logAudit(admin, "student", classSession.id, "join_accepted", {
    participantId: participant.id,
  });

  return jsonResponse({
    participantId: participant.id,
    classSessionId: classSession.id,
    status: classSession.status,
  });
});

async function logAudit(
  admin: ReturnType<typeof createClient>,
  actorType: "student" | "instructor" | "system",
  classSessionId: string | null,
  eventType: string,
  payload: Record<string, unknown>
) {
  await admin.from("audit_events").insert({
    actor_type: actorType,
    class_session_id: classSessionId,
    event_type: eventType,
    payload_json: payload,
  });
}
