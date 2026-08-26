/**
 * Student identifier normalization (spec section 4: "המערכת מנרמלת את
 * המזהה בצד השרת ובודקת אותו מול roster"). Pure and dependency-free so
 * it can run identically in the browser (inline format hints) and in
 * the join-session Edge Function (source of truth before HMAC hashing).
 *
 * NOTE: this file is intentionally mirrored at
 * supabase/functions/_shared/identifier.ts because Deno Edge Functions
 * resolve imports differently from the Vite bundle and cannot reach
 * into src/. Keep both copies in sync if the normalization rules change.
 */

/** Strips whitespace/separators; pads pure-numeric IDs (ת.ז., student number) to 9 digits. */
export function normalizeIdentifier(raw: string): string {
  const stripped = raw.trim().replace(/[\s.\-]/g, "");
  if (/^\d+$/.test(stripped)) {
    return stripped.padStart(9, "0");
  }
  return stripped.toUpperCase();
}

export function isPlausibleIdentifier(raw: string): boolean {
  const normalized = normalizeIdentifier(raw);
  return normalized.length >= 3 && normalized.length <= 20;
}
