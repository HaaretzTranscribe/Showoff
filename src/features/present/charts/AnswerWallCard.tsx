import type { Language } from "@/i18n/translations";
import type { TextAnswer } from "../lesson2Visualizations";

/**
 * Every free-text answer as a quote card, newest first, in a masonry of
 * columns. Cards are keyed by their row, so on a live update only newly
 * arrived answers fade in; the type size steps down as the wall fills up
 * so a whole class still fits on the projector.
 */
export function AnswerWallCard({ answers, lang }: { answers: TextAnswer[]; lang: Language }) {
  const size =
    answers.length <= 6 ? "text-xl lg:text-2xl" : answers.length <= 15 ? "text-lg lg:text-xl" : "text-base lg:text-lg";

  return (
    <div dir={lang === "he" ? "rtl" : "ltr"} className="mx-auto w-full max-w-6xl columns-1 gap-4 py-2 sm:columns-2 lg:columns-3">
      {answers.map((answer, i) => (
        <figure
          key={answer.key}
          className="animate-fade-in-up relative mb-4 break-inside-avoid rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-sm"
          style={{ animationDelay: `${Math.min(i, 20) * 70}ms`, animationFillMode: "both" }}
        >
          <span aria-hidden="true" className="absolute -top-3 start-4 font-serif text-5xl leading-none text-blue-200">
            “
          </span>
          <blockquote className={`${size} font-medium leading-snug text-slate-800`}>{answer.text}</blockquote>
        </figure>
      ))}
    </div>
  );
}
