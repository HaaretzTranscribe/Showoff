/**
 * Supabase/Postgrest errors are plain objects with a `.message`, not
 * real `Error` instances — `instanceof Error` misses them and
 * `String(err)` collapses to the useless "[object Object]".
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}
