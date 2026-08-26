import { useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/translations";

/**
 * First screen a student sees after scanning the class QR code /
 * opening the join link — pick a language before anything else
 * renders in either direction (spec 2.3: independent language choice
 * per user, RTL/LTR layout follows the pick).
 */
export function LanguagePickerPage() {
  const { setLocale } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  function choose(locale: Locale) {
    setLocale(locale);
    navigate({ pathname: "/join", search: searchParams.toString() }, { replace: true });
  }

  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", marginTop: "3rem" }}>
      <h1 style={{ fontSize: "1.25rem" }}>ShowOff</h1>
      <div style={{ display: "flex", gap: "1rem" }}>
        <button type="button" onClick={() => choose("he")} dir="rtl" style={{ fontSize: "1.25rem", padding: "1rem 2rem" }}>
          עברית
        </button>
        <button type="button" onClick={() => choose("en")} dir="ltr" style={{ fontSize: "1.25rem", padding: "1rem 2rem" }}>
          English
        </button>
      </div>
    </main>
  );
}
