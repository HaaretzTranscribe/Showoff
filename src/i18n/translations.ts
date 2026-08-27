/**
 * Central typed translation dictionary (spec section 2.3 / 27:
 * "שכבת i18n מרכזית; אין לכתוב מחרוזות UI ישירות בתוך components").
 * Components never hardcode UI strings — they call t("some.key") and
 * get a compile-time error if the key doesn't exist in *both* locales,
 * because `en` is the type source and `he` is checked against it.
 */

const en = {
  common: {
    appName: "ShowOff",
    languageName: "English",
    switchLanguage: "עברית",
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
    error: "Something went wrong",
    retry: "Retry",
  },
  join: {
    title: "Join the class",
    identifierLabel: "Full name",
    codeLabel: "Class code",
    submit: "Join",
    submitting: "Joining…",
    success: "You're in! Waiting for the questionnaire to open.",
    genericError: "Couldn't join. Check your ID and the class code and try again.",
    authRequiredError: "Connection not ready yet — please retry in a moment.",
  },
  questionnaire: {
    submit: "Submit",
    submitting: "Submitting…",
    submitted: "Submitted",
    editHint: "You can still update your answer until the instructor locks responses.",
    lockedNotice: "Responses are locked. You can no longer edit your answers.",
  },
  studio: {
    nav: {
      courses: "Courses",
      lessons: "Lessons",
      questions: "Questions",
    },
    courses: {
      title: "Courses",
      newCourse: "New course",
      titleLabel: "Course title",
      empty: "No courses yet.",
    },
    lessons: {
      title: "Lessons",
      newLesson: "New lesson",
      titleLabelHe: "Title (Hebrew)",
      titleLabelEn: "Title (English)",
      plannedAt: "Planned date",
      rosterPolicy: "Roster policy",
      empty: "No lessons yet.",
      openSession: "Open session",
      openResponses: "Open questionnaire",
      sessionCode: "Class code",
      openPresentation: "Open presentation screen",
      exportAttendance: "Export attendance (CSV)",
      joinUrlHint: "Students join at",
    },
    questions: {
      title: "Questions",
      newQuestion: "New question",
      type: "Type",
      promptHe: "Prompt (Hebrew)",
      promptEn: "Prompt (English)",
      empty: "No questions yet.",
    },
  },
  presentation: {
    waiting: "Waiting for students to join",
    liveCount: "Joined",
    noSessionSelected: "Open a lesson's session to start presenting.",
  },
} as const;

const he: Translation<typeof en> = {
  common: {
    appName: "ShowOff",
    languageName: "עברית",
    switchLanguage: "English",
    loading: "טוען…",
    save: "שמירה",
    cancel: "ביטול",
    error: "משהו השתבש",
    retry: "נסה שוב",
  },
  join: {
    title: "הצטרפות לשיעור",
    identifierLabel: "שם מלא",
    codeLabel: "קוד כיתה",
    submit: "הצטרפות",
    submitting: "מצטרף…",
    success: "הצטרפת! ממתין לפתיחת השאלון.",
    genericError: "ההצטרפות נכשלה. בדקו את המספר ואת קוד הכיתה ונסו שוב.",
    authRequiredError: "החיבור עדיין לא מוכן — נסו שוב בעוד רגע.",
  },
  questionnaire: {
    submit: "שליחה",
    submitting: "שולח…",
    submitted: "נשלח",
    editHint: "ניתן עדיין לעדכן את התשובה עד שהמרצה ינעל את התשובות.",
    lockedNotice: "התשובות נעולות. לא ניתן עוד לערוך.",
  },
  studio: {
    nav: {
      courses: "קורסים",
      lessons: "שיעורים",
      questions: "שאלות",
    },
    courses: {
      title: "קורסים",
      newCourse: "קורס חדש",
      titleLabel: "שם הקורס",
      empty: "אין עדיין קורסים.",
    },
    lessons: {
      title: "שיעורים",
      newLesson: "שיעור חדש",
      titleLabelHe: "כותרת (עברית)",
      titleLabelEn: "כותרת (אנגלית)",
      plannedAt: "תאריך מתוכנן",
      rosterPolicy: "מדיניות roster",
      empty: "אין עדיין שיעורים.",
      openSession: "פתיחת session",
      openResponses: "פתיחת שאלון",
      sessionCode: "קוד כיתה",
      openPresentation: "פתיחת מסך הקרנה",
      exportAttendance: "ייצוא נוכחות (CSV)",
      joinUrlHint: "סטודנטים מצטרפים ב",
    },
    questions: {
      title: "שאלות",
      newQuestion: "שאלה חדשה",
      type: "סוג",
      promptHe: "ניסוח (עברית)",
      promptEn: "ניסוח (אנגלית)",
      empty: "אין עדיין שאלות.",
    },
  },
  presentation: {
    waiting: "ממתין להצטרפות סטודנטים",
    liveCount: "הצטרפו",
    noSessionSelected: "פתחו session של שיעור כדי להתחיל להקרין.",
  },
};

/** Forces `he` to have exactly the same shape as `en`, string-for-string. */
type Translation<T> = { [K in keyof T]: T[K] extends string ? string : Translation<T[K]> };

export type Locale = "he" | "en";

export const dictionaries: Record<Locale, Translation<typeof en>> = { en, he };

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  he: "rtl",
  en: "ltr",
};

type DotPaths<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : {
      [K in keyof T & string]: DotPaths<T[K], `${Prefix}${Prefix extends "" ? "" : "."}${K}`>;
    }[keyof T & string];

export type TranslationKey = DotPaths<typeof en>;

export function resolveTranslation(locale: Locale, key: TranslationKey): string {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = dictionaries[locale];
  for (const part of parts) {
    node = node?.[part];
  }
  if (typeof node !== "string") {
    // Fall back to English rather than crashing the render.
    let fallback: any = dictionaries.en;
    for (const part of parts) fallback = fallback?.[part];
    return typeof fallback === "string" ? fallback : key;
  }
  return node;
}
