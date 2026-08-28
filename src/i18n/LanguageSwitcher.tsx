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
              ? "font-semibold underline underline-offset-4"
              : "text-gray-500 hover:text-gray-800"
          }
        >
          {languageLabel[candidate]}
        </button>
      ))}
    </div>
  );
}
