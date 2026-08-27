import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { errorMessage } from "@/lib/errorMessage";
import type { Question, QuestionType } from "@/domain/types";
import {
  createQuestion,
  createQuestionOption,
  deleteQuestion,
  deleteQuestionOption,
  listQuestionOptions,
  listQuestions,
  updateQuestion,
} from "./api";

const CHOICE_TYPES: QuestionType[] = ["single_choice", "multiple_choice"];

/** Generates a stable_key the instructor never has to think about — it
 * only needs to be unique and never change, not mean anything to them. */
function generateStableKey(): string {
  return `q_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

const QUESTION_TYPES: QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "number",
  "scale",
  "text",
  "yes_no",
  "datetime",
  "hidden_meta",
];

function configForType(type: QuestionType, scale: { min: number; max: number; step: number }): Record<string, unknown> {
  if (type === "scale") {
    return { required: true, min: scale.min, max: scale.max, step: scale.step };
  }
  return { required: true };
}

interface QuestionFormFieldsProps {
  type: QuestionType;
  setType: (type: QuestionType) => void;
  promptHe: string;
  setPromptHe: (value: string) => void;
  promptEn: string;
  setPromptEn: (value: string) => void;
  scaleMin: number;
  setScaleMin: (value: number) => void;
  scaleMax: number;
  setScaleMax: (value: number) => void;
  scaleStep: number;
  setScaleStep: (value: number) => void;
}

function QuestionFormFields({
  type,
  setType,
  promptHe,
  setPromptHe,
  promptEn,
  setPromptEn,
  scaleMin,
  setScaleMin,
  scaleMax,
  setScaleMax,
  scaleStep,
  setScaleStep,
}: QuestionFormFieldsProps) {
  const { t } = useI18n();
  return (
    <>
      <label>
        {t("studio.questions.type")}
        <select value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
          {QUESTION_TYPES.map((qt) => (
            <option key={qt} value={qt}>
              {qt}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("studio.questions.promptHe")}
        <input value={promptHe} onChange={(e) => setPromptHe(e.target.value)} dir="rtl" />
      </label>
      <label>
        {t("studio.questions.promptEn")}
        <input value={promptEn} onChange={(e) => setPromptEn(e.target.value)} dir="ltr" />
      </label>

      {type === "scale" && (
        <fieldset>
          <label>
            min
            <input type="number" value={scaleMin} onChange={(e) => setScaleMin(Number(e.target.value))} />
          </label>
          <label>
            max
            <input type="number" value={scaleMax} onChange={(e) => setScaleMax(Number(e.target.value))} />
          </label>
          <label>
            step
            <input type="number" value={scaleStep} onChange={(e) => setScaleStep(Number(e.target.value))} />
          </label>
        </fieldset>
      )}
    </>
  );
}

export function QuestionsPage() {
  const { t } = useI18n();
  const { lessonId } = useParams<{ lessonId: string }>();
  const queryClient = useQueryClient();

  const [type, setType] = useState<QuestionType>("single_choice");
  const [promptHe, setPromptHe] = useState("");
  const [promptEn, setPromptEn] = useState("");
  const [scaleMin, setScaleMin] = useState(1);
  const [scaleMax, setScaleMax] = useState(5);
  const [scaleStep, setScaleStep] = useState(1);

  const questionsQuery = useQuery({
    queryKey: ["questions", lessonId],
    queryFn: () => listQuestions(lessonId!),
    enabled: Boolean(lessonId),
  });

  const createMutation = useMutation({
    mutationFn: createQuestion,
    onSuccess: () => {
      setPromptHe("");
      setPromptEn("");
      queryClient.invalidateQueries({ queryKey: ["questions", lessonId] });
    },
  });

  if (!lessonId) return null;

  return (
    <section>
      <h1>{t("studio.questions.title")}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate({
            lessonId,
            stableKey: generateStableKey(),
            type,
            prompt: { he: promptHe, en: promptEn },
            orderIndex: questionsQuery.data?.length ?? 0,
            config: configForType(type, { min: scaleMin, max: scaleMax, step: scaleStep }),
          });
        }}
      >
        <QuestionFormFields
          type={type}
          setType={setType}
          promptHe={promptHe}
          setPromptHe={setPromptHe}
          promptEn={promptEn}
          setPromptEn={setPromptEn}
          scaleMin={scaleMin}
          setScaleMin={setScaleMin}
          scaleMax={scaleMax}
          setScaleMax={setScaleMax}
          scaleStep={scaleStep}
          setScaleStep={setScaleStep}
        />

        <button type="submit" disabled={createMutation.isPending || (!promptHe.trim() && !promptEn.trim())}>
          {t("studio.questions.newQuestion")}
        </button>
        {createMutation.isError && <p role="alert">{errorMessage(createMutation.error)}</p>}
      </form>

      {questionsQuery.isLoading && <p>{t("common.loading")}</p>}
      {questionsQuery.data && questionsQuery.data.length === 0 && <p>{t("studio.questions.empty")}</p>}

      <ol>
        {questionsQuery.data?.map((q) => (
          <QuestionRow key={q.id} question={q} lessonId={lessonId} />
        ))}
      </ol>
    </section>
  );
}

function QuestionRow({ question, lessonId }: { question: Question; lessonId: string }) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<QuestionType>(question.type);
  const [promptHe, setPromptHe] = useState(question.prompt.he);
  const [promptEn, setPromptEn] = useState(question.prompt.en);
  const existingScale = question.config as Partial<{ min: number; max: number; step: number }>;
  const [scaleMin, setScaleMin] = useState(existingScale.min ?? 1);
  const [scaleMax, setScaleMax] = useState(existingScale.max ?? 5);
  const [scaleStep, setScaleStep] = useState(existingScale.step ?? 1);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateQuestion(question.id, {
        type,
        prompt: { he: promptHe, en: promptEn },
        config: configForType(type, { min: scaleMin, max: scaleMax, step: scaleStep }),
      }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["questions", lessonId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteQuestion(question.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["questions", lessonId] }),
  });

  if (editing) {
    return (
      <li>
        <QuestionFormFields
          type={type}
          setType={setType}
          promptHe={promptHe}
          setPromptHe={setPromptHe}
          promptEn={promptEn}
          setPromptEn={setPromptEn}
          scaleMin={scaleMin}
          setScaleMin={setScaleMin}
          scaleMax={scaleMax}
          setScaleMax={setScaleMax}
          scaleStep={scaleStep}
          setScaleStep={setScaleStep}
        />
        <button type="button" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          {t("common.save")}
        </button>
        <button type="button" onClick={() => setEditing(false)}>
          {t("common.cancel")}
        </button>
        {updateMutation.isError && <span role="alert">{errorMessage(updateMutation.error)}</span>}
      </li>
    );
  }

  return (
    <li>
      [{question.type}] {question.prompt[locale] || question.prompt.he || question.prompt.en}{" "}
      <button type="button" onClick={() => setEditing(true)}>
        {t("common.edit")}
      </button>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(t("common.confirmDelete"))) deleteMutation.mutate();
        }}
        disabled={deleteMutation.isPending}
      >
        {t("common.delete")}
      </button>
      {deleteMutation.isError && <span role="alert">{errorMessage(deleteMutation.error)}</span>}
      {CHOICE_TYPES.includes(question.type) && <QuestionOptionsManager questionId={question.id} />}
    </li>
  );
}

function QuestionOptionsManager({ questionId }: { questionId: string }) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [labelHe, setLabelHe] = useState("");
  const [labelEn, setLabelEn] = useState("");

  const optionsQuery = useQuery({
    queryKey: ["question-options", questionId],
    queryFn: () => listQuestionOptions(questionId),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      createQuestionOption(questionId, { he: labelHe, en: labelEn }, optionsQuery.data?.length ?? 0),
    onSuccess: () => {
      setLabelHe("");
      setLabelEn("");
      queryClient.invalidateQueries({ queryKey: ["question-options", questionId] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (optionId: string) => deleteQuestionOption(optionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["question-options", questionId] }),
  });

  return (
    <div>
      <strong>{t("studio.questions.answerOptions")}</strong>
      {optionsQuery.data && optionsQuery.data.length === 0 && <p>{t("studio.questions.noOptionsYet")}</p>}
      <ul>
        {optionsQuery.data?.map((opt) => (
          <li key={opt.id}>
            {opt.label[locale] || opt.label.he || opt.label.en}{" "}
            <button type="button" onClick={() => removeMutation.mutate(opt.id)} disabled={removeMutation.isPending}>
              {t("common.delete")}
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (labelHe.trim() || labelEn.trim()) addMutation.mutate();
        }}
      >
        <label>
          {t("studio.questions.optionLabelHe")}
          <input value={labelHe} onChange={(e) => setLabelHe(e.target.value)} dir="rtl" />
        </label>
        <label>
          {t("studio.questions.optionLabelEn")}
          <input value={labelEn} onChange={(e) => setLabelEn(e.target.value)} dir="ltr" />
        </label>
        <button type="submit" disabled={addMutation.isPending || (!labelHe.trim() && !labelEn.trim())}>
          {t("studio.questions.addOption")}
        </button>
        {addMutation.isError && <span role="alert">{errorMessage(addMutation.error)}</span>}
      </form>
    </div>
  );
}
