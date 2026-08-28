export type Language = "en" | "he";

export const languages: Language[] = ["en", "he"];

export const languageDir: Record<Language, "ltr" | "rtl"> = {
  en: "ltr",
  he: "rtl",
};

export const languageLabel: Record<Language, string> = {
  en: "English",
  he: "עברית",
};

export interface Dictionary {
  languageName: string;
  live: {
    waitingTitle: string;
    waitingBody: string;
  };
  join: {
    loading: string;
    notFoundTitle: string;
    notFoundBody: string;
    notOpenTitle: string;
    notOpenBody: string;
    closedTitle: string;
    closedBody: string;
    formInstructions: string;
    formMissing: string;
    continueButton: string;
  };
  control: {
    title: string;
    waitingOption: string;
    activeLabel: string;
    loading: string;
    noQuestions: string;
  };
  common: {
    loading: string;
    error: string;
    back: string;
    scanToJoin: string;
  };
}

const en: Dictionary = {
  languageName: "English",
  live: {
    waitingTitle: "Waiting for the next question…",
    waitingBody: "Keep this page open — it will update automatically.",
  },
  join: {
    loading: "Loading…",
    notFoundTitle: "Session not found",
    notFoundBody: "Check the link or QR code and try again.",
    notOpenTitle: "Attendance isn't open yet",
    notOpenBody: "Ask your instructor to open attendance.",
    closedTitle: "Attendance is closed",
    closedBody: "This session's attendance window has ended.",
    formInstructions: "Enter your details and the code shown in class in the form below.",
    formMissing: "No roll-call form has been set up for this session yet.",
    continueButton: "Continue to class",
  },
  control: {
    title: "Question control",
    waitingOption: "Waiting / no active question",
    activeLabel: "live now",
    loading: "Loading questions…",
    noQuestions: "No questions configured for this lesson yet.",
  },
  common: {
    loading: "Loading…",
    error: "Error",
    back: "Back",
    scanToJoin: "Scan your class QR code to join.",
  },
};

const he: Dictionary = {
  languageName: "עברית",
  live: {
    waitingTitle: "ממתינים לשאלה הבאה…",
    waitingBody: "השאירו את הדף פתוח — הוא יתעדכן אוטומטית.",
  },
  join: {
    loading: "טוען…",
    notFoundTitle: "המפגש לא נמצא",
    notFoundBody: "בדקו את הקישור או קוד ה-QR ונסו שוב.",
    notOpenTitle: "הנוכחות עדיין לא נפתחה",
    notOpenBody: "בקשו מהמרצה לפתוח את הנוכחות.",
    closedTitle: "הנוכחות נסגרה",
    closedBody: "חלון הנוכחות למפגש הזה הסתיים.",
    formInstructions: "הזינו את הפרטים שלכם והקוד שמוצג בכיתה בטופס שמופיע למטה.",
    formMissing: "עדיין לא הוגדר טופס נוכחות למפגש הזה.",
    continueButton: "המשך לשיעור",
  },
  control: {
    title: "בקרת שאלות",
    waitingOption: "המתנה / אין שאלה פעילה",
    activeLabel: "פעיל כעת",
    loading: "טוען שאלות…",
    noQuestions: "עדיין לא הוגדרו שאלות למפגש הזה.",
  },
  common: {
    loading: "טוען…",
    error: "שגיאה",
    back: "חזרה",
    scanToJoin: "סרקו את קוד ה-QR של הכיתה כדי להצטרף.",
  },
};

export const dictionaries: Record<Language, Dictionary> = { en, he };
