import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import type { Question } from "@/domain/types";
import { getLessonIdForSession, listOptionsForQuestions, listQuestionsForLesson, submitResponse } from "./questionnaire";

interface LocationState {
  classSessionId: string;
  participantId: string;
}

export function QuestionnairePage() {
  const { t, locale } = useI18n();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const questionsQuery = useQuery({
    queryKey: ["questionnaire", state?.classSessionId],
    queryFn: async () => {
      const lessonId = await getLessonIdForSession(state!.classSessionId);
      const questions = await listQuestionsForLesson(lessonId);
      const options = await listOptionsForQuestions(questions.map((q) => q.id));
      return { questions, options };
    },
    enabled: Boolean(state?.classSessionId),
  });

  if (!state) {
    return <p role="alert">{t("common.error")}</p>;
  }

  return (
    <main>
      <LanguageSwitcher />
      {questionsQuery.isLoading && <p>{t("common.loading")}</p>}
      {questionsQuery.isError && <p role="alert">{t("common.error")}</p>}
      {questionsQuery.data?.questions
        .filter((q) => q.type !== "hidden_meta")
        .map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            options={questionsQuery.data!.options.filter((o) => o.questionId === question.id)}
            locale={locale}
            classSessionId={state.classSessionId}
            participantId={state.participantId}
          />
        ))}
    </main>
  );
}

function QuestionField({
  question,
  options,
  locale,
  classSessionId,
  participantId,
}: {
  question: Question;
  options: { value: string; label: { he: string; en: string } }[];
  locale: "he" | "en";
  classSessionId: string;
  participantId: string;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(valueToSend: unknown) {
    setStatus("saving");
    try {
      await submitResponse({ classSessionId, participantId, questionId: question.id, valueJson: valueToSend });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  const prompt = question.prompt[locale] || question.prompt.he || question.prompt.en;

  return (
    <fieldset>
      <legend>{prompt}</legend>

      {(question.type === "single_choice" || question.type === "yes_no") && (
        <div role="radiogroup">
          {(question.type === "yes_no"
            ? [
                { value: "yes", label: { he: "כן", en: "Yes" } },
                { value: "no", label: { he: "לא", en: "No" } },
              ]
            : options
          ).map((opt) => (
            <label key={opt.value}>
              <input
                type="radio"
                name={question.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => {
                  setValue(opt.value);
                  handleSubmit(opt.value);
                }}
              />
              {opt.label[locale] || opt.label.he || opt.label.en}
            </label>
          ))}
        </div>
      )}

      {question.type === "number" && (
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => value !== "" && handleSubmit(Number(value))}
        />
      )}

      {question.type === "scale" && "min" in question.config && "max" in question.config && (
        <input
          type="range"
          min={(question.config as { min: number }).min}
          max={(question.config as { max: number }).max}
          step={(question.config as { step?: number }).step ?? 1}
          value={value || String((question.config as { min: number }).min)}
          onChange={(e) => {
            setValue(e.target.value);
            handleSubmit(Number(e.target.value));
          }}
        />
      )}

      {question.type === "text" && (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => handleSubmit(value)}
          maxLength={5000}
        />
      )}

      {status === "saving" && <span>{t("questionnaire.submitting")}</span>}
      {status === "saved" && <span>{t("questionnaire.submitted")}</span>}
      {status === "error" && (
        <span role="alert">{t("common.error")}</span>
      )}
    </fieldset>
  );
}
