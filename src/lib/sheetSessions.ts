import type { PublicSessionInfo } from "@/domain/types";

/**
 * The lessons-sheet row for this /join URL segment (usually a
 * lesson_number, or an explicit session_slug), read on the server
 * (netlify/functions/sheets.mts) so the sheet's address stays out of
 * the browser. Every field returned is meant to be public — it's shown
 * to anyone who opens the /join link.
 */
export async function getPublicSessionInfo(sessionSlug: string): Promise<PublicSessionInfo | null> {
  try {
    const response = await fetch(`/api/session?lesson=${encodeURIComponent(sessionSlug)}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
