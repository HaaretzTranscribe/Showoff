import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { listQuestionsForLesson } from "@/lib/questions";
import { getActiveQuestion, setActiveQuestion } from "@/lib/activeQuestion";
import type { QuestionInfo } from "@/domain/types";

/**
 * Unlisted control surface — not linked from any student-facing page.
 * Deliberately has no login (same trust model as the rest of this
 * project); anyone with this URL can change what's live for this
 * lesson. See docs/phase_2_addendum_live_questions.md.
 */
export function InstructorControlPage() {
  const { sessionSlug = "" } = useParams();
  const { t } = useI18n();

  const [questions, setQuestions] = useState<QuestionInfo[] | null>(null);
  const [activeQuestionNumber, setActiveQuestionNumber] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listQuestionsForLesson(sessionSlug), getActiveQuestion(sessionSlug)]).then(
      ([loadedQuestions, active]) => {
        if (cancelled) return;
        setQuestions(loadedQuestions);
        setActiveQuestionNumber(active?.questionNumber ?? null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [sessionSlug]);

  async function handleActivate(question: QuestionInfo) {
    setPending(question.questionNumber);
    const ok = await setActiveQuestion(sessionSlug, {
      formUrl: question.googleFormUrl,
      title: question.title,
      questionNumber: question.questionNumber,
    });
    setPending(null);
    if (ok) setActiveQuestionNumber(question.questionNumber);
  }

  async function handleClear() {
    setPending("waiting");
    const ok = await setActiveQuestion(sessionSlug, null);
    setPending(null);
    if (ok) setActiveQuestionNumber(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <span className="font-semibold">{t.control.title}</span>
        <LanguageSwitcher />
      </div>

      <div className="max-w-md mx-auto p-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleClear}
          disabled={pending !== null}
          className={`w-full text-start px-4 py-4 rounded-xl border text-lg font-medium disabled:opacity-50 ${
            activeQuestionNumber === null
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white border-gray-300 hover:bg-gray-50"
          }`}
        >
          {t.control.waitingOption}
          {activeQuestionNumber === null && (
            <span className="ms-2 text-sm font-normal opacity-80">({t.control.activeLabel})</span>
          )}
        </button>

        {questions === null && <p className="text-gray-500">{t.control.loading}</p>}

        {questions !== null && questions.length === 0 && (
          <p className="text-gray-500">{t.control.noQuestions}</p>
        )}

        {questions?.map((question) => {
          const isActive = activeQuestionNumber === question.questionNumber;
          return (
            <button
              key={question.questionNumber}
              type="button"
              onClick={() => handleActivate(question)}
              disabled={pending !== null}
              className={`w-full text-start px-4 py-4 rounded-xl border text-lg font-medium disabled:opacity-50 ${
                isActive
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
            >
              {question.questionNumber}. {question.title}
              {isActive && <span className="ms-2 text-sm font-normal opacity-80">({t.control.activeLabel})</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
