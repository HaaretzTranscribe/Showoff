import { useI18n } from "./I18nProvider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "he" ? "en" : "he")}
      aria-label="switch language"
    >
      {t("common.switchLanguage")}
    </button>
  );
}
