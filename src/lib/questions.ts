import type { QuestionInfo } from "@/domain/types";

/** The lesson's ordered questions, read on the server (netlify/functions/sheets.mts). */
export async function listQuestionsForLesson(lessonKey: string): Promise<QuestionInfo[]> {
  try {
    const response = await fetch(`/api/questions?lesson=${encodeURIComponent(lessonKey)}`, {
      cache: "no-store",
    });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}
