import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { isPlausibleIdentifier } from "@/domain/identifier";
import { JoinError, joinSession } from "./joinSession";

type FormState = "idle" | "submitting" | "error";

export function JoinPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const lessonJoinSlug = searchParams.get("l") ?? undefined;
  const sessionId = searchParams.get("s") ?? undefined;

  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = isPlausibleIdentifier(identifier) && code.trim().length >= 4;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || state === "submitting") return;
    setState("submitting");
    setErrorMessage(null);
    try {
      const joined = await joinSession({
        sessionId,
        lessonJoinSlug,
        studentIdentifier: identifier,
        attendanceCode: code,
      });
      navigate("/questionnaire", {
        state: { classSessionId: joined.classSessionId, participantId: joined.participantId },
      });
    } catch (err) {
      const message =
        err instanceof JoinError && err.code === "auth_required"
          ? t("join.authRequiredError")
          : t("join.genericError");
      setErrorMessage(message);
      setState("error");
    }
  }

  return (
    <main>
      <LanguageSwitcher />
      <h1>{t("join.title")}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {t("join.identifierLabel")}
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            inputMode="text"
            autoComplete="name"
            required
          />
        </label>
        <label>
          {t("join.codeLabel")}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            autoComplete="off"
            required
          />
        </label>
        <button type="submit" disabled={!canSubmit || state === "submitting"}>
          {state === "submitting" ? t("join.submitting") : t("join.submit")}
        </button>
        {state === "error" && errorMessage && (
          <p role="alert" aria-live="assertive">
            {errorMessage}
          </p>
        )}
      </form>
    </main>
  );
}
