import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { getPublicSessionInfo } from "@/lib/sheetSessions";
import { getActiveQuestion } from "@/lib/activeQuestion";
import { toEmbedUrl } from "@/lib/googleForm";
import type { ActiveQuestionState, PublicSessionInfo } from "@/domain/types";

const POLL_INTERVAL_MS = 3000;

/**
 * Waiting screen when no question is active; swaps to an embedded
 * question Form automatically when the instructor activates one, by
 * polling /api/active-question — see
 * docs/phase_2_addendum_live_questions.md. The iframe's `src` just
 * changes with React state; the page itself never reloads or
 * navigates.
 */
export function LiveSessionPage() {
  const { sessionSlug = "" } = useParams();
  const { t } = useI18n();
  const [session, setSession] = useState<PublicSessionInfo | null>(null);
  const [activeQuestion, setActiveQuestionState] = useState<ActiveQuestionState | null>(null);
  const pollingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getPublicSessionInfo(sessionSlug).then((info) => {
      if (!cancelled) setSession(info);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionSlug]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (pollingRef.current) return;
      pollingRef.current = true;
      const active = await getActiveQuestion(sessionSlug);
      pollingRef.current = false;
      if (!cancelled) setActiveQuestionState(active);
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionSlug]);

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900">
      <div className="flex items-center justify-between p-4">
        {session ? (
          <div>
            <h2 className="text-sm font-semibold">{session.courseName}</h2>
            <p className="text-gray-500 text-xs">{session.title}</p>
          </div>
        ) : (
          <span />
        )}
        <LanguageSwitcher />
      </div>

      {activeQuestion ? (
        <iframe
          key={activeQuestion.formUrl}
          title={activeQuestion.title ?? "Question"}
          src={toEmbedUrl(activeQuestion.formUrl)}
          className="flex-1 w-full border-0"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 text-center">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-gray-900 animate-pulse" />
          <h1 className="text-2xl font-bold">{t.live.waitingTitle}</h1>
          <p className="text-gray-500">{t.live.waitingBody}</p>
        </div>
      )}
    </div>
  );
}
