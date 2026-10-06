import type { Language } from "./translations";

/**
 * A lesson's content language comes from its key in the sheets: keys
 * ending in "e" or "en" (e.g. "1e", the sheet's convention) are the
 * English run of a lesson, with their own translated Forms; anything else
 * is the original Hebrew lesson.
 */
export function lessonLanguage(lessonKey: string): Language {
  return /en?$/i.test(lessonKey) ? "en" : "he";
}

/** The key of the same lesson in `lang`: "1" <-> "1e". */
export function lessonKeyFor(lessonKey: string, lang: Language): string {
  const base = lessonKey.replace(/en?$/i, "");
  return lang === "en" ? `${base}e` : base;
}
