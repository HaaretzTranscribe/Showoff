import { useParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useLiveParticipantCount } from "./liveParticipantCount";

export function PresentationPage() {
  const { t } = useI18n();
  const { classSessionId } = useParams<{ classSessionId: string }>();
  const count = useLiveParticipantCount(classSessionId ?? null);

  if (!classSessionId) {
    return <p>{t("presentation.noSessionSelected")}</p>;
  }

  return (
    <main>
      <LanguageSwitcher />
      <p>{t("presentation.waiting")}</p>
      <div aria-live="polite">
        <span>{t("presentation.liveCount")}: </span>
        <strong style={{ fontSize: "4rem" }}>{count}</strong>
      </div>
    </main>
  );
}
