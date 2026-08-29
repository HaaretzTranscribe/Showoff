import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export function PresentationLayout({
  title,
  lastUpdated,
  onRefresh,
  dark = false,
  respondentCount = null,
  prevHref = null,
  nextHref = null,
  children,
}: {
  title: string;
  lastUpdated: Date | null;
  onRefresh: () => void;
  dark?: boolean;
  respondentCount?: number | null;
  prevHref?: string | null;
  nextHref?: string | null;
  children: ReactNode;
}) {
  const { t, lang } = useI18n();

  const navLinkClass = `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
    dark ? "bg-white/10 text-white hover:bg-white/20" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
  }`;
  const navDisabledClass = `rounded-full px-3 py-1 text-xs font-medium ${
    dark ? "text-white/20" : "text-slate-300"
  }`;

  return (
    <div className={`flex h-screen flex-col ${dark ? "bg-black text-white" : "bg-white text-slate-900"}`}>
      <div
        className={`flex items-center justify-between border-b p-3 ${
          dark ? "border-white/10" : "border-blue-100"
        }`}
      >
        <div className="flex items-center gap-3">
          {respondentCount !== null && (
            <span className={`text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>
              {respondentCount} {t.present.respondents}
            </span>
          )}
          {lastUpdated && (
            <span className={`text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>
              {lastUpdated.toLocaleTimeString(lang === "he" ? "he-IL" : "en-US")}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              dark
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            {t.present.refreshNow}
          </button>
        </div>
        <div className="flex items-center gap-3">
          {prevHref ? (
            <Link to={prevHref} className={navLinkClass}>
              {t.present.previous}
            </Link>
          ) : (
            <span className={navDisabledClass}>{t.present.previous}</span>
          )}
          {nextHref ? (
            <Link to={nextHref} className={navLinkClass}>
              {t.present.next}
            </Link>
          ) : (
            <span className={navDisabledClass}>{t.present.next}</span>
          )}
          <LanguageSwitcher />
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-auto px-6 py-6">
        <h1
          className={`animate-fade-in-up mb-4 text-center text-4xl font-extrabold sm:text-5xl ${
            dark ? "text-white" : "text-blue-900"
          }`}
        >
          {title}
        </h1>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
