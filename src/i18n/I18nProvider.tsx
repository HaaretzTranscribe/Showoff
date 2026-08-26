import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type Locale, type TranslationKey, localeDirection, resolveTranslation } from "./translations";

const STORAGE_KEY = "lcdl.locale";

/**
 * Language preference is per-user/per-browser and independent between
 * instructor and student (spec 2.3: "למרצה ולסטודנט תהיה בחירת שפה
 * עצמאית"), so we simply namespace by localStorage per browser context
 * (each app runs in its own tab/session) rather than syncing centrally.
 */
function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "he";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "he" || stored === "en") return stored;
  return window.navigator.language?.toLowerCase().startsWith("he") ? "he" : "en";
}

interface I18nContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);
  const dir = localeDirection[locale];

  useEffect(() => {
    // Switching language never touches Scene/filter/session state (spec
    // 2.3) — this effect only updates layout direction, nothing else.
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir,
      setLocale,
      t: (key: TranslationKey) => resolveTranslation(locale, key),
    }),
    [locale, dir]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
