import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { toEmbedUrl } from "@/lib/googleForm";
import { getPublicSessionInfo } from "@/lib/sheetSessions";
import type { PublicSessionInfo } from "@/domain/types";

type Phase = "loading" | "not_found" | "not_open" | "closed" | "open";

function formatDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function JoinPage() {
  const { sessionSlug = "" } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<PublicSessionInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicSessionInfo(sessionSlug).then((info) => {
      if (cancelled) return;
      if (!info) {
        setPhase("not_found");
        return;
      }
      setSession(info);
      if (info.status === "draft") setPhase("not_open");
      else if (info.status === "closed") setPhase("closed");
      else setPhase("open");
    });
    return () => {
      cancelled = true;
    };
  }, [sessionSlug]);

  function handleContinue() {
    navigate(`/live/${sessionSlug}`, { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex flex-col items-center px-4 gap-4">
        {phase === "loading" && <p className="text-center text-gray-500 mt-4">{t.join.loading}</p>}

        {phase === "not_found" && (
          <StatusMessage title={t.join.notFoundTitle} body={t.join.notFoundBody} />
        )}

        {phase === "not_open" && (
          <StatusMessage
            title={t.join.notOpenTitle}
            body={t.join.notOpenBody}
            session={session}
            lang={lang}
          />
        )}

        {phase === "closed" && (
          <StatusMessage
            title={t.join.closedTitle}
            body={t.join.closedBody}
            session={session}
            lang={lang}
          />
        )}

        {phase === "open" && session && (
          <div className="w-full max-w-sm flex flex-col gap-5 mt-2">
            <div className="text-center">
              <h1 className="text-2xl font-bold">{session.courseName}</h1>
              <p className="text-gray-500">{formatDate(session.sessionDate, lang)}</p>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">{t.join.codeLabel}</p>
              <p className="text-4xl font-bold tracking-[0.3em]">{session.attendanceCode}</p>
            </div>

            <p className="text-center text-sm text-gray-500">{t.join.formInstructions}</p>

            {session.googleFormUrl ? (
              <iframe
                title="Roll call"
                src={toEmbedUrl(session.googleFormUrl)}
                className="w-full border border-gray-200 rounded-xl"
                height={900}
              />
            ) : (
              <p className="text-center text-red-600 text-sm">{t.join.formMissing}</p>
            )}

            <button
              type="button"
              onClick={handleContinue}
              className="w-full bg-gray-900 text-white rounded-xl py-4 text-lg font-semibold"
            >
              {t.join.continueButton}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusMessage({
  title,
  body,
  session,
  lang,
}: {
  title: string;
  body: string;
  session?: PublicSessionInfo | null;
  lang?: string;
}) {
  return (
    <div className="flex flex-col gap-3 text-center mt-4">
      {session && (
        <div>
          <h2 className="text-lg font-semibold">{session.courseName}</h2>
          {lang && <p className="text-gray-500 text-sm">{formatDate(session.sessionDate, lang)}</p>}
        </div>
      )}
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-gray-500">{body}</p>
    </div>
  );
}
