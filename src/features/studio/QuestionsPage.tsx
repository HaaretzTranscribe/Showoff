import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { errorMessage } from "@/lib/errorMessage";
import type { QuestionType } from "@/domain/types";
import { createQuestion, listQuestions } from "./api";

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

  function configForType(): Record<string, unknown> {
    if (type === "scale") {
      return { required: true, min: scaleMin, max: scaleMax, step: scaleStep };
    }
    return { required: true };
  }

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
            config: configForType(),
          });
        }}
      >
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

        <button
          type="submit"
          disabled={createMutation.isPending || (!promptHe.trim() && !promptEn.trim())}
        >
          {t("studio.questions.newQuestion")}
        </button>
        {createMutation.isError && <p role="alert">{errorMessage(createMutation.error)}</p>}
      </form>

      {questionsQuery.isLoading && <p>{t("common.loading")}</p>}
      {questionsQuery.data && questionsQuery.data.length === 0 && <p>{t("studio.questions.empty")}</p>}

      <ol>
        {questionsQuery.data?.map((q) => (
          <li key={q.id}>
            [{q.type}] {q.prompt.he || q.prompt.en}
          </li>
        ))}
      </ol>
    </section>
  );
}
