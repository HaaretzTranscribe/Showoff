import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { isPlausibleName } from "@/domain/validation";
import type { PublicSessionInfo } from "@/domain/types";
import { getPublicSessionInfo, submitAttendance, type AttendanceSubmitError } from "./attendanceApi";

type Phase = "loading" | "not_found" | "not_open" | "closed" | "form" | "confirmed";

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
  const [fullName, setFullName] = useState("");
  const [attendanceCode, setAttendanceCode] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRecorded, setAlreadyRecorded] = useState(false);

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
      else setPhase("form");
    });
    return () => {
      cancelled = true;
    };
  }, [sessionSlug]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldError(null);

    if (!isPlausibleName(fullName)) {
      setFieldError(t.join.errorNameTooShort);
      return;
    }
    if (attendanceCode.trim().length === 0) {
      setFieldError(t.join.errorInvalidCode);
      return;
    }

    setSubmitting(true);
    const result = await submitAttendance({ sessionSlug, fullName, attendanceCode });
    setSubmitting(false);

    if (!result.ok) {
      handleSubmitError(result.error);
      return;
    }

    setAlreadyRecorded(result.data.alreadyRecorded);
    setPhase("confirmed");
  }

  function handleSubmitError(error: AttendanceSubmitError) {
    switch (error) {
      case "invalid_code":
        setFieldError(t.join.errorInvalidCode);
        break;
      case "session_not_open":
        setPhase("not_open");
        break;
      case "session_closed":
        setPhase("closed");
        break;
      case "session_not_found":
        setPhase("not_found");
        break;
      case "network_error":
        setFieldError(t.join.errorNetwork);
        break;
      default:
        setFieldError(t.join.errorGeneric);
    }
  }

  function handleContinue() {
    navigate(`/live/${sessionSlug}`, { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-start justify-center px-4">
        <div className="w-full max-w-sm mt-4">
          {phase === "loading" && <p className="text-center text-gray-500">{t.join.loading}</p>}

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

          {phase === "form" && session && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="text-center">
                <h1 className="text-2xl font-bold">{session.courseName}</h1>
                <p className="text-gray-500">{formatDate(session.sessionDate, lang)}</p>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">{t.join.fullNameLabel}</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.join.fullNamePlaceholder}
                  className="border border-gray-300 rounded-xl px-4 py-4 text-lg"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">{t.join.attendanceCodeLabel}</span>
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  value={attendanceCode}
                  onChange={(e) => setAttendanceCode(e.target.value)}
                  placeholder={t.join.attendanceCodePlaceholder}
                  className="border border-gray-300 rounded-xl px-4 py-4 text-lg tracking-widest text-center"
                />
              </label>

              {fieldError && <p className="text-red-600 text-sm text-center">{fieldError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="bg-gray-900 text-white rounded-xl py-4 text-lg font-semibold disabled:opacity-50"
              >
                {submitting ? t.join.submitting : t.join.submit}
              </button>
            </form>
          )}

          {phase === "confirmed" && (
            <div className="flex flex-col gap-6 items-center text-center">
              <h1 className="text-2xl font-bold">
                {alreadyRecorded ? t.join.alreadyRecordedTitle : t.join.confirmedTitle}
              </h1>
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
    <div className="flex flex-col gap-3 text-center">
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
