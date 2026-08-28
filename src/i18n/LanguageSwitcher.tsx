import { languageLabel, languages } from "./translations";
import { useI18n } from "./I18nProvider";

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex gap-2 text-sm">
      {languages.map((candidate) => (
        <button
          key={candidate}
          type="button"
          onClick={() => setLang(candidate)}
          className={
            candidate === lang
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
