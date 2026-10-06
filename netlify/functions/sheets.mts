// GET /api/session?lesson=<key>                     -> that lesson's public row from the lessons sheet, or null
// GET /api/questions?lesson=<key>                   -> the lesson's ordered questions (no responses links)
// GET /api/responses?lesson=<key>&question=<n>      -> { headers, rows } for that question's Form responses
//
// The sheets are read here on the server so their addresses stay out of
// the browser bundle — students can't open the lessons/questions sheet or
// the raw responses sheets. Reads VITE_* as a fallback so the existing
// Netlify env vars keep working without renaming.

import type { Context } from "@netlify/functions";
import { getResponses, getSession, listQuestions, type SheetsConfig } from "../../src/lib/server/sheetsServer";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function sheetsConfig(): SheetsConfig {
  return {
    sessionsCsvUrl: process.env.SESSIONS_SHEET_CSV_URL || process.env.VITE_SESSIONS_SHEET_CSV_URL,
    questionsCsvUrl: process.env.QUESTIONS_SHEET_CSV_URL || process.env.VITE_QUESTIONS_SHEET_CSV_URL,
  };
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  const lesson = url.searchParams.get("lesson");
  if (!lesson) return jsonResponse({ error: "missing_lesson" }, 400);

  switch (url.pathname) {
    case "/api/session":
      return jsonResponse(await getSession(sheetsConfig(), lesson));
    case "/api/questions":
      return jsonResponse(await listQuestions(sheetsConfig(), lesson));
    case "/api/responses": {
      const question = url.searchParams.get("question");
      if (!question) return jsonResponse({ error: "missing_question" }, 400);
      const result = await getResponses(sheetsConfig(), lesson, question);
      if (result === "not_configured") return jsonResponse({ error: "not_configured" }, 404);
      if (result === null) return jsonResponse({ error: "unreadable" }, 502);
      return jsonResponse(result);
    }
    default:
      return jsonResponse({ error: "not_found" }, 404);
  }
};

export const config = { path: ["/api/session", "/api/questions", "/api/responses"] };
