import { useLocation, useNavigate } from "react-router-dom";
import { languageLabel, languages, type Language } from "./translations";
import { useI18n } from "./I18nProvider";
import { lessonKeyFor, lessonLanguage } from "./lessonLanguage";

/**
 * With `switchesLesson` (instructor control/present pages), picking a
 * language also jumps to that language's run of the lesson — e.g. from
 * /control/1 to /control/1e — keeping the rest of the path (the viz
 * number on /present). Elsewhere it only changes the UI language.
 */
export function LanguageSwitcher({ switchesLesson = false }: { switchesLesson?: boolean }) {
  const { lang, setLang } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const lessonPath = switchesLesson ? pathname.match(/^\/(control|present)\/([^/]+)(.*)$/) : null;
  // On lesson-switching pages the highlighted language is the lesson's own.
  const active = lessonPath ? lessonLanguage(decodeURIComponent(lessonPath[2])) : lang;

  function pick(candidate: Language) {
    setLang(candidate);
    if (lessonPath) {
      const [, page, key, rest] = lessonPath;
      const target = lessonKeyFor(decodeURIComponent(key), candidate);
      navigate(`/${page}/${encodeURIComponent(target)}${rest}`);
    }
  }

  return (
    <div className="flex gap-2 text-sm">
      {languages.map((candidate) => (
        <button
          key={candidate}
          type="button"
          onClick={() => pick(candidate)}
          className={
            candidate === active
              ? "font-semibold text-blue-700 underline underline-offset-4 decoration-2"
              : "text-slate-400 transition-colors hover:text-blue-600"
          }
        >
          {languageLabel[candidate]}
        </button>
      ))}
    </div>
  );
}
