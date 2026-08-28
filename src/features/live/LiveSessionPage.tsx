import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { getPublicSessionInfo } from "@/lib/sheetSessions";
import type { PublicSessionInfo } from "@/domain/types";

/**
 * Phase 1: a polished waiting state only. Phase 2 will turn this into
 * an embedded-Google-Forms viewer that switches questions in real time
 * as the instructor advances them — this component and its route
 * (keyed by session_slug, the same identifier /join already uses) are
 * the integration point for that; no other Phase 1 code should need to
 * change.
 */
export function LiveSessionPage() {
  const { sessionSlug = "" } = useParams();
  const { t } = useI18n();
  const [session, setSession] = useState<PublicSessionInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicSessionInfo(sessionSlug).then((info) => {
      if (!cancelled) setSession(info);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionSlug]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 text-center">
        {session && (
          <div>
            <h2 className="text-lg font-semibold">{session.courseName}</h2>
            <p className="text-gray-500 text-sm">{session.title}</p>
          </div>
        )}
        <div className="flex flex-col items-center gap-4">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full bg-gray-900 animate-pulse"
          />
          <h1 className="text-2xl font-bold">{t.live.waitingTitle}</h1>
          <p className="text-gray-500">{t.live.waitingBody}</p>
        </div>
      </div>
    </div>
  );
}
