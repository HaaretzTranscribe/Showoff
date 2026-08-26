import { supabase } from "@/lib/supabaseClient";
import type { Question, QuestionOption } from "@/domain/types";
import { submitResponseSchema } from "@/domain/validation";

export async function getLessonIdForSession(classSessionId: string): Promise<string> {
  const { data, error } = await supabase
    .from("class_sessions")
    .select("lesson_id")
    .eq("id", classSessionId)
    .single();
  if (error) throw error;
  return data.lesson_id as string;
}

interface QuestionRow {
  id: string;
  lesson_id: string;
  stable_key: string;
  type: Question["type"];
  prompt_he: string;
  prompt_en: string;
  config_json: Question["config"];
  order_index: number;
}

export async function listQuestionsForLesson(lessonId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data as QuestionRow[]).map((row) => ({
    id: row.id,
    lessonId: row.lesson_id,
    stableKey: row.stable_key,
    type: row.type,
    prompt: { he: row.prompt_he, en: row.prompt_en },
    config: row.config_json,
    orderIndex: row.order_index,
  }));
}

interface QuestionOptionRow {
  id: string;
  question_id: string;
  value: string;
  label_he: string;
  label_en: string;
  order_index: number;
}

export async function listOptionsForQuestions(questionIds: string[]): Promise<QuestionOption[]> {
  if (questionIds.length === 0) return [];
  const { data, error } = await supabase
    .from("question_options")
    .select("*")
    .in("question_id", questionIds)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data as QuestionOptionRow[]).map((row) => ({
    id: row.id,
    questionId: row.question_id,
    value: row.value,
    label: { he: row.label_he, en: row.label_en },
    orderIndex: row.order_index,
  }));
}

export async function submitResponse(params: {
  classSessionId: string;
  participantId: string;
  questionId: string;
  valueJson: unknown;
}): Promise<void> {
  const parsed = submitResponseSchema.parse({
    classSessionId: params.classSessionId,
    questionId: params.questionId,
    valueJson: params.valueJson,
    status: "submitted",
  });

  const numericValue = typeof parsed.valueJson === "number" ? parsed.valueJson : null;

  const { error } = await supabase.from("responses").upsert(
    {
      class_session_id: parsed.classSessionId,
      participant_id: params.participantId,
      question_id: parsed.questionId,
      value_json: parsed.valueJson,
      numeric_value: numericValue,
      status: parsed.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "class_session_id,participant_id,question_id" }
  );
  if (error) throw error;
}
