import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export function PresentationLayout({
  title,
  lastUpdated,
  onRefresh,
  dark = false,
  children,
}: {
  title: string;
  lastUpdated: Date | null;
  onRefresh: () => void;
  dark?: boolean;
  children: ReactNode;
}) {
  const { t, lang } = useI18n();

  return (
    <div className={`flex h-screen flex-col ${dark ? "bg-black text-white" : "bg-white text-slate-900"}`}>
      <div
        className={`flex items-center justify-between border-b p-4 ${
          dark ? "border-white/10" : "border-blue-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <h1 className={`font-semibold ${dark ? "text-white" : "text-blue-900"}`}>{title}</h1>
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
        <LanguageSwitcher />
      </div>
      <div className="flex flex-1 flex-col overflow-auto px-6 py-6">{children}</div>
    </div>
  );
}
