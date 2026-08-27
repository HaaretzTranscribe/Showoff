import { supabase } from "@/lib/supabaseClient";
import type { Course, Lesson, LessonConfig, Question, QuestionConfig, QuestionOption, QuestionType } from "@/domain/types";
import { createLessonSchema, createQuestionSchema, type CreateLessonInput, type CreateQuestionInput } from "@/domain/validation";

/**
 * Thin data-access layer between the Instructor Studio UI and
 * Postgres. Every write re-runs the same Zod schemas the Edge
 * Functions use (spec section 15: don't trust the frontend alone —
 * Postgres constraints + RLS are the actual backstop, this layer just
 * gives instant, well-typed feedback and a single call-site per table).
 */

// --- Courses ---

interface CourseRow {
  id: string;
  title: string;
  owner_user_id: string;
  created_at: string;
}

function mapCourse(row: CourseRow): Course {
  return { id: row.id, title: row.title, ownerUserId: row.owner_user_id, createdAt: row.created_at };
}

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CourseRow[]).map(mapCourse);
}

export async function createCourse(title: string): Promise<Course> {
  const { data: userRow, error: userError } = await supabase.auth.getUser();
  if (userError || !userRow.user) throw new Error("not authenticated");

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", userRow.user.id)
    .single();
  if (appUserError || !appUser) throw new Error("instructor profile not found");

  // Deliberately NOT .insert(...).select().single(): Postgres evaluates
  // RETURNING's row-visibility against SELECT policies as part of the
  // same INSERT statement, before the on_course_created trigger (which
  // grants the owner's course_members row) has necessarily taken
  // effect for that check. Insert with a client-generated id, then
  // fetch it back as a separate request — by then the trigger has
  // fully committed and courses_select_member passes normally.
  const id = crypto.randomUUID();
  const { error: insertError } = await supabase.from("courses").insert({ id, title, owner_user_id: appUser.id });
  if (insertError) throw insertError;

  const { data: created, error: fetchError } = await supabase.from("courses").select("*").eq("id", id).single();
  if (fetchError) throw fetchError;
  return mapCourse(created as CourseRow);
}

// --- Lessons ---

interface LessonRow {
  id: string;
  course_id: string;
  title_he: string;
  title_en: string;
  planned_at: string | null;
  internal_notes: string | null;
  config_json: LessonConfig;
  join_slug: string | null;
  created_at: string;
}

function mapLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    courseId: row.course_id,
    title: { he: row.title_he, en: row.title_en },
    plannedAt: row.planned_at,
    internalNotes: row.internal_notes,
    config: row.config_json,
    createdAt: row.created_at,
  };
}

export async function listLessons(courseId: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as LessonRow[]).map(mapLesson);
}

export async function createLesson(input: CreateLessonInput): Promise<Lesson> {
  const parsed = createLessonSchema.parse(input);
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      course_id: parsed.courseId,
      title_he: parsed.title.he,
      title_en: parsed.title.en,
      planned_at: parsed.plannedAt,
      internal_notes: parsed.internalNotes,
      config_json: parsed.config,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapLesson(data as LessonRow);
}

/** Lets an instructor add the missing-language title later — bilingual
 * fields only require one language at creation time, not both. */
export async function updateLessonTitle(id: string, title: { he: string; en: string }): Promise<void> {
  const { error } = await supabase.from("lessons").update({ title_he: title.he, title_en: title.en }).eq("id", id);
  if (error) throw error;
}

// --- Questions ---

interface QuestionRow {
  id: string;
  lesson_id: string;
  stable_key: string;
  type: QuestionType;
  prompt_he: string;
  prompt_en: string;
  config_json: QuestionConfig;
  order_index: number;
}

function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    stableKey: row.stable_key,
    type: row.type,
    prompt: { he: row.prompt_he, en: row.prompt_en },
    config: row.config_json,
    orderIndex: row.order_index,
  };
}

export async function listQuestions(lessonId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data as QuestionRow[]).map(mapQuestion);
}

export async function createQuestion(input: CreateQuestionInput): Promise<Question> {
  const parsed = createQuestionSchema.parse(input);
  const { data, error } = await supabase
    .from("questions")
    .insert({
      lesson_id: parsed.lessonId,
      stable_key: parsed.stableKey,
      type: parsed.type,
      prompt_he: parsed.prompt.he,
      prompt_en: parsed.prompt.en,
      config_json: parsed.config,
      order_index: parsed.orderIndex,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapQuestion(data as QuestionRow);
}

/**
 * stable_key alone is immutable (enforced by a DB trigger) — Scene
 * bindings in a later phase reference it, never the label. Type and
 * config CAN change; spec section 7.2 expects the system to flag any
 * dependent Scene as "broken" when that happens rather than forbidding
 * the edit outright (Scene Builder itself isn't built yet, so there's
 * nothing to flag today).
 */
export async function updateQuestion(
  id: string,
  updates: { type: QuestionType; prompt: { he: string; en: string }; config: Record<string, unknown> }
): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .update({
      type: updates.type,
      prompt_he: updates.prompt.he,
      prompt_en: updates.prompt.en,
      config_json: updates.config,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

// --- Question options (answer choices for single/multiple_choice) ---

interface QuestionOptionRow {
  id: string;
  question_id: string;
  value: string;
  label_he: string;
  label_en: string;
  order_index: number;
}

function mapQuestionOption(row: QuestionOptionRow): QuestionOption {
  return {
    id: row.id,
    questionId: row.question_id,
    value: row.value,
    label: { he: row.label_he, en: row.label_en },
    orderIndex: row.order_index,
  };
}

export async function listQuestionOptions(questionId: string): Promise<QuestionOption[]> {
  const { data, error } = await supabase
    .from("question_options")
    .select("*")
    .eq("question_id", questionId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data as QuestionOptionRow[]).map(mapQuestionOption);
}

/** `value` (the stored answer, e.g. in a response's value_json) is
 * generated the same way stable_key is — it just needs to be a stable
 * handle, not something the instructor has to invent. */
export async function createQuestionOption(
  questionId: string,
  label: { he: string; en: string },
  orderIndex: number
): Promise<void> {
  const value = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const { error } = await supabase
    .from("question_options")
    .insert({ question_id: questionId, value, label_he: label.he, label_en: label.en, order_index: orderIndex });
  if (error) throw error;
}

export async function updateQuestionOptionLabel(id: string, label: { he: string; en: string }): Promise<void> {
  const { error } = await supabase
    .from("question_options")
    .update({ label_he: label.he, label_en: label.en })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuestionOption(id: string): Promise<void> {
  const { error } = await supabase.from("question_options").delete().eq("id", id);
  if (error) throw error;
}
