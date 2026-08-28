// GET  /api/active-question?lesson=<key>  -> current active question for that lesson, or null
// POST /api/active-question  { lesson, formUrl, title, questionNumber }  -> sets it
// POST /api/active-question  { lesson, formUrl: null }                  -> clears it (waiting state)
//
// This is the one piece of state that genuinely needs a live backend
// (see docs/phase_2_addendum_live_questions.md) — everything else in
// this app still runs off a published Google Sheet with no backend at
// all. Deliberately unauthenticated, same trust model as the rest of
// this project (the attendance code, the join link): the control page
// that calls this isn't linked from anywhere a student would find it.
// Do not treat this as real access control.

import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

interface ActiveQuestionBody {
  lesson?: string;
  formUrl?: string | null;
  title?: string | null;
  questionNumber?: string | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export default async (req: Request, _context: Context) => {
  const store = getStore("active-questions");

  if (req.method === "GET") {
    const lesson = new URL(req.url).searchParams.get("lesson");
    if (!lesson) return jsonResponse({ error: "missing_lesson" }, 400);
    const data = await store.get(lesson, { type: "json" });
    return jsonResponse(data ?? null);
  }

  if (req.method === "POST") {
    let body: ActiveQuestionBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }
    if (!body.lesson) return jsonResponse({ error: "missing_lesson" }, 400);

    if (!body.formUrl) {
      await store.delete(body.lesson);
    } else {
      await store.setJSON(body.lesson, {
        formUrl: body.formUrl,
        title: body.title ?? null,
        questionNumber: body.questionNumber ?? null,
      });
    }
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "method_not_allowed" }, 405);
};

export const config = { path: "/api/active-question" };
