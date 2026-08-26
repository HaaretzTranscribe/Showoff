import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

/**
 * Fixed-window rate limit backed by rate_limit_hits (spec section 21:
 * "Rate limit ל־join attempts ו־response spam"). Not a queue or a
 * distributed limiter — good enough for a single-classroom-sized burst,
 * intentionally simple for Phase 1.
 */
export async function checkRateLimit(
  admin: SupabaseClient,
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
