import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { toEmbedUrl } from "@/lib/googleForm";
import { getPublicSessionInfo } from "@/lib/sheetSessions";
import type { PublicSessionInfo } from "@/domain/types";

type Phase = "loading" | "not_found" | "not_open" | "closed" | "open";

/** Returns null for blank/unparseable dates rather than rendering "Invalid Date" — the sheet's session_date is free text, often not filled in yet. */
function formatDate(raw: string, lang: string): string | null {
  if (!raw.trim()) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white text-slate-900">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex flex-col items-center px-4 gap-4">
        {phase === "loading" && <p className="text-center text-slate-400 mt-4">{t.join.loading}</p>}

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
          <div className="animate-fade-in-up w-full max-w-sm flex flex-col gap-5 mt-2">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-blue-900">{session.courseName}</h1>
              <DateLine sessionDate={session.sessionDate} lang={lang} />
            </div>

            <p className="text-center text-sm text-slate-500">{t.join.formInstructions}</p>

            {session.googleFormUrl ? (
              <iframe
                title="Roll call"
                src={toEmbedUrl(session.googleFormUrl)}
                className="w-full rounded-xl border border-blue-100 shadow-sm"
                height={900}
              />
            ) : (
              <p className="text-center text-red-600 text-sm">{t.join.formMissing}</p>
            )}

            <button
              type="button"
              onClick={handleContinue}
              className="w-full rounded-xl bg-blue-700 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 active:scale-[0.99]"
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
    <div className="animate-fade-in-up flex flex-col gap-3 text-center mt-4">
      {session && (
        <div>
          <h2 className="text-lg font-semibold text-blue-900">{session.courseName}</h2>
          {lang && <DateLine sessionDate={session.sessionDate} lang={lang} className="text-sm" />}
        </div>
      )}
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="text-slate-500">{body}</p>
    </div>
  );
}

function DateLine({
  sessionDate,
  lang,
  className = "",
}: {
  sessionDate: string;
  lang: string;
  className?: string;
}) {
  const formatted = formatDate(sessionDate, lang);
  if (!formatted) return null;
  return <p className={`text-slate-500 ${className}`.trim()}>{formatted}</p>;
}
