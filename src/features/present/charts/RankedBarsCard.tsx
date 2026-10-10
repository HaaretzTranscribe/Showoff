import type { Language } from "@/i18n/translations";
import type { ChoiceShare } from "../lesson2Visualizations";

/**
 * Horizontal bars for long option texts, most-picked first. Plain HTML
 * rather than Recharts: long labels wrap naturally, and each row is keyed
 * by its label so a live update just eases the bar to its new width
 * instead of re-mounting it. Direction follows the lesson's language, not
 * the UI's, so Hebrew options read right-to-left even on an English UI.
 */
export function RankedBarsCard({ shares, lang }: { shares: ChoiceShare[]; lang: Language }) {
  const top = shares[0]?.value ?? 0;

  return (
    <div dir={lang === "he" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 py-4">
      {shares.map((share, i) => {
        const leading = share.value === top && top > 0;
        return (
          <div
            key={share.label}
            className="animate-fade-in-up"
            style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
          >
            <div className="mb-2 flex items-baseline justify-between gap-6">
              <span
                className={`text-lg leading-snug sm:text-xl lg:text-2xl ${
                  leading ? "font-bold text-blue-900" : "font-medium text-slate-700"
                }`}
              >
                {share.label}
              </span>
              <span
                className={`ranked-bar-value shrink-0 tabular-nums text-2xl font-extrabold sm:text-3xl ${
                  leading ? "text-blue-700" : "text-blue-400"
                }`}
                style={{ animationDelay: `${900 + i * 120}ms` }}
              >
                {share.value}%
              </span>
            </div>
            <div className="h-5 overflow-hidden rounded-full bg-blue-50 sm:h-6">
              <div
                className={`ranked-bar-fill h-full rounded-full ${
                  leading ? "bg-gradient-to-r from-blue-800 to-blue-500 rtl:bg-gradient-to-l" : "bg-blue-300"
                }`}
                // A 0% option still shows a small stub.
                style={{ width: `max(0.75rem, ${share.value}%)`, animationDelay: `${i * 120}ms` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
