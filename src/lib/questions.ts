import { parseCsvRecords } from "./csv";
import type { QuestionInfo } from "@/domain/types";

const questionsCsvUrl = import.meta.env.VITE_QUESTIONS_SHEET_CSV_URL as string | undefined;

export const isQuestionsSheetConfigured = Boolean(questionsCsvUrl);

function pick(record: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (record[key]) return record[key];
  }
  return "";
}

function recordToQuestion(record: Record<string, string>): QuestionInfo | null {
  const lessonKey = pick(record, "lesson_number", "lesson", "session_slug", "slug");
  const questionNumber = pick(record, "question_number", "question", "number");
  const googleFormUrl = pick(record, "google_form_url", "form_url");
  if (!lessonKey || !questionNumber || !googleFormUrl) return null;

  return {
    lessonKey,
    questionNumber,
    title: pick(record, "title", "label"),
    googleFormUrl,
  };
}

/** Fetches the published questions Sheet (same publish-to-web-as-CSV setup as the lessons sheet) and returns this lesson's questions, ordered. */
export async function listQuestionsForLesson(lessonKey: string): Promise<QuestionInfo[]> {
  if (!questionsCsvUrl) return [];

  let text: string;
  try {
    const response = await fetch(questionsCsvUrl, { cache: "no-store" });
    if (!response.ok) return [];
    text = await response.text();
  } catch {
    return [];
  }

  const records = parseCsvRecords(text);
  const questions = records.map(recordToQuestion).filter((q): q is QuestionInfo => q !== null);

  return questions
    .filter((q) => q.lessonKey === lessonKey)
    .sort((a, b) => {
      const numericDiff = Number(a.questionNumber) - Number(b.questionNumber);
      return Number.isNaN(numericDiff) ? a.questionNumber.localeCompare(b.questionNumber) : numericDiff;
    });
}
