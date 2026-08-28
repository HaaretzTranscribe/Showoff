import { parseCsvRecords } from "./csv";
import type { PublicSessionInfo, SessionStatus } from "@/domain/types";

const sheetCsvUrl = import.meta.env.VITE_SESSIONS_SHEET_CSV_URL as string | undefined;

export const isSheetConfigured = Boolean(sheetCsvUrl);

function pick(record: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (record[key]) return record[key];
  }
  return "";
}

function parseStatus(raw: string): SessionStatus {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "open") return "open";
  if (normalized === "closed") return "closed";
  return "draft";
}

function recordToSessionInfo(record: Record<string, string>): PublicSessionInfo | null {
  const sessionSlug = pick(record, "session_slug", "slug");
  if (!sessionSlug) return null;

  return {
    sessionSlug,
    courseName: pick(record, "course_name", "course"),
    title: pick(record, "session_title", "title", "lesson_title"),
    sessionDate: pick(record, "session_date", "date"),
    attendanceCode: pick(record, "attendance_code", "code"),
    googleFormUrl: pick(record, "google_form_url", "form_url") || null,
    status: parseStatus(pick(record, "status")),
  };
}

/**
 * Fetches the published Google Sheet (File -> Share -> Publish to web,
 * as CSV) and finds the row for this session_slug. Every field on the
 * returned row is meant to be public — it's shown to anyone who opens
 * the /join link, the same trust level as the QR code itself.
 *
 * `cache: "no-store"` so an instructor flipping a row to "open" right
 * before class shows up promptly rather than serving a stale fetch
 * from the browser's HTTP cache. (Google's own CDN in front of the
 * published CSV can still lag by up to a few minutes — see the
 * addendum.)
 */
export async function getPublicSessionInfo(
  sessionSlug: string
): Promise<PublicSessionInfo | null> {
  if (!sheetCsvUrl) return null;

  let text: string;
  try {
    const response = await fetch(sheetCsvUrl, { cache: "no-store" });
    if (!response.ok) return null;
    text = await response.text();
  } catch {
    return null;
  }

  const records = parseCsvRecords(text);
  const sessions = records.map(recordToSessionInfo).filter((s): s is PublicSessionInfo => s !== null);

  return sessions.find((s) => s.sessionSlug === sessionSlug) ?? null;
}
