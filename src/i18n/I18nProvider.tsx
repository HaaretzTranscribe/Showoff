import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dictionaries, languageDir, type Dictionary, type Language } from "./translations";

const STORAGE_KEY = "showoff:lang";

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Dictionary;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLanguage(): Language {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
  if (stored === "en" || stored === "he") return stored;
  if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("he")) {
    return "he";
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectInitialLanguage);

  const dir = languageDir[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (next: Language) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, t: dictionaries[lang], dir }),
    [lang, dir]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
