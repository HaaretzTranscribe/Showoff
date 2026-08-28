import type { ActiveQuestionState } from "@/domain/types";

/** Client for the /api/active-question Netlify Function (netlify/functions/active-question.mts). */
export async function getActiveQuestion(lessonKey: string): Promise<ActiveQuestionState | null> {
  try {
    const response = await fetch(`/api/active-question?lesson=${encodeURIComponent(lessonKey)}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function setActiveQuestion(
  lessonKey: string,
  question: { formUrl: string; title: string; questionNumber: string } | null
): Promise<boolean> {
  try {
    const response = await fetch("/api/active-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lesson: lessonKey,
        formUrl: question?.formUrl ?? null,
        title: question?.title ?? null,
        questionNumber: question?.questionNumber ?? null,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
