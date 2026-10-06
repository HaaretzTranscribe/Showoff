// Server-side only (imported by netlify/functions/sheets.mts, never by the
// browser bundle). Reads the lessons/questions Google Sheet and each
// question's responses sheet on the server, so their addresses never
// reach a student's browser — the browser only gets the rows it needs.

import { parseCsv, parseCsvRecords } from "../csv";
import { toCsvUrl } from "../googleSheetUrl";
import type { PublicSessionInfo, SessionStatus } from "../../domain/types";

export interface SheetsConfig {
  sessionsCsvUrl?: string;
  questionsCsvUrl?: string;
}

export interface PublicQuestion {
  questionNumber: string;
  title: string;
  googleFormUrl: string;
}

interface QuestionRow extends PublicQuestion {
  lessonKey: string;
  responsesUrl: string;
}

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

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "follow" });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * A responses link in the questions sheet can be either kind:
 * - a "publish to web" link (/spreadsheets/d/e/...): Google serves a
 *   cached copy that lags real submissions by several minutes;
 * - a regular sheet link (/spreadsheets/d/<id>/edit...), shared as
 *   "anyone with the link can view": read live via the export endpoint.
 */
export function toLiveCsvUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.includes("/spreadsheets/d/e/")) return toCsvUrl(trimmed);
  const id = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!id) return toCsvUrl(trimmed);
  const gid = trimmed.match(/[#?&]gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
}

export async function getSession(config: SheetsConfig, lessonKey: string): Promise<PublicSessionInfo | null> {
  if (!config.sessionsCsvUrl) return null;
  const text = await fetchText(toCsvUrl(config.sessionsCsvUrl));
  if (text === null) return null;

  for (const record of parseCsvRecords(text)) {
    const sessionSlug =
      pick(record, "session_slug", "slug") || pick(record, "lesson_number", "lesson", "number");
    if (sessionSlug !== lessonKey) continue;
    return {
      sessionSlug,
      courseName: pick(record, "course_name", "course"),
      title: pick(record, "session_title", "title", "lesson_title"),
      sessionDate: pick(record, "session_date", "date"),
      googleFormUrl: pick(record, "google_form_url", "form_url") || null,
      status: parseStatus(pick(record, "status")),
    };
  }
  return null;
}

async function questionRows(config: SheetsConfig, lessonKey: string): Promise<QuestionRow[]> {
  if (!config.questionsCsvUrl) return [];
  const text = await fetchText(toCsvUrl(config.questionsCsvUrl));
  if (text === null) return [];

  return parseCsvRecords(text)
    .map((record) => ({
      lessonKey: pick(record, "lesson_number", "lesson", "session_slug", "slug"),
      questionNumber: pick(record, "question_number", "question", "number"),
      title: pick(record, "title", "label"),
      googleFormUrl: pick(record, "google_form_url", "form_url"),
      responsesUrl: pick(record, "responses_csv_url", "response_csv_url", "responses_url"),
    }))
    .filter((q) => q.lessonKey === lessonKey && q.questionNumber && q.googleFormUrl)
    .sort((a, b) => {
      const numericDiff = Number(a.questionNumber) - Number(b.questionNumber);
      return Number.isNaN(numericDiff) ? a.questionNumber.localeCompare(b.questionNumber) : numericDiff;
    });
}

/** The lesson's questions, ordered, without their responses-sheet links. */
export async function listQuestions(config: SheetsConfig, lessonKey: string): Promise<PublicQuestion[]> {
  return (await questionRows(config, lessonKey)).map(({ questionNumber, title, googleFormUrl }) => ({
    questionNumber,
    title,
    googleFormUrl,
  }));
}

/**
 * The responses table for one question, or "not_configured" if the
 * question has no responses link. null means the sheet couldn't be read.
 */
export async function getResponses(
  config: SheetsConfig,
  lessonKey: string,
  questionNumber: string
): Promise<{ headers: string[]; rows: string[][] } | "not_configured" | null> {
  const question = (await questionRows(config, lessonKey)).find((q) => q.questionNumber === questionNumber);
  if (!question?.responsesUrl) return "not_configured";

  const text = await fetchText(toLiveCsvUrl(question.responsesUrl));
  // A sheet that isn't shared redirects to a Google sign-in HTML page.
  if (text === null || /^\s*<!DOCTYPE html/i.test(text)) return null;

  const allRows = parseCsv(text).filter((r) => r.some((cell) => cell.trim() !== ""));
  if (allRows.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = allRows;
  return { headers, rows };
}
