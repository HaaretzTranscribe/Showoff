/**
 * Student identifier normalization (spec section 4: "המערכת מנרמלת את
 * המזהה בצד השרת ובודקת אותו מול roster"). Pure and dependency-free so
 * it can run identically in the browser (inline format hints) and in
 * the join-session Edge Function (source of truth before HMAC hashing).
 *
 * The identifier is now a full name rather than an ID number (raw
 * names are recorded separately for attendance — see
 * attendance_records / 0006_attendance_records.sql); this only feeds
 * the de-duplication hash, so normalization just needs to make trivial
 * retyping differences (spacing, case) hash the same way.
 *
 * NOTE: this file is intentionally mirrored inline inside
 * supabase/functions/join-session/index.ts, since that function is
 * deployed by pasting into the Supabase Dashboard's editor rather than
 * the CLI. Keep both copies in sync if the normalization rules change.
 */

export function normalizeIdentifier(raw: string): string {
  const stripped = raw.trim().replace(/[\s.\-]/g, "");
  if (/^\d+$/.test(stripped)) {
    return stripped.padStart(9, "0");
  }
  return stripped.toUpperCase();
}

/** Checked against the raw trimmed input, not the normalized form —
 * normalizeIdentifier pads short numeric strings to 9 digits, which
 * would otherwise mask a too-short input like "1" as plausible. */
export function isPlausibleIdentifier(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.length >= 3 && trimmed.length <= 64;
}
