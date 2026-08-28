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
    codeLabel: string;
    formInstructions: string;
    formMissing: string;
    continueButton: string;
  };
  studio: {
    signInTitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    sendLink: string;
    checkEmail: string;
    signOut: string;
    coursesTitle: string;
    newCourseNamePlaceholder: string;
    createCourse: string;
    noCourses: string;
    sessionsTitle: string;
    newSessionTitle: string;
    sessionTitleLabel: string;
    sessionTitlePlaceholder: string;
    sessionDateLabel: string;
    attendanceCodeLabel: string;
    googleFormUrlLabel: string;
    googleFormUrlPlaceholder: string;
    googleFormUrlMissing: string;
    changeFormUrl: string;
    createSession: string;
    status: string;
    statusDraft: string;
    statusOpen: string;
    statusClosed: string;
    openAttendance: string;
    closeAttendance: string;
    changeCode: string;
    save: string;
    cancel: string;
    joinUrlLabel: string;
    copyJoinUrl: string;
    copied: string;
    noSessions: string;
    rollCallNote: string;
  };
  common: {
    loading: string;
    error: string;
    back: string;
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
    codeLabel: "Today's code",
    formInstructions: "Enter your name and the code above in the form below.",
    formMissing: "No roll-call form has been set up for this session yet.",
    continueButton: "Continue to class",
  },
  studio: {
    signInTitle: "Instructor sign in",
    emailLabel: "Email",
    emailPlaceholder: "you@university.edu",
    sendLink: "Send magic link",
    checkEmail: "Check your email for a sign-in link.",
    signOut: "Sign out",
    coursesTitle: "Courses",
    newCourseNamePlaceholder: "Course name",
    createCourse: "Create course",
    noCourses: "No courses yet.",
    sessionsTitle: "Sessions",
    newSessionTitle: "New session",
    sessionTitleLabel: "Session title",
    sessionTitlePlaceholder: "e.g. Lecture 3",
    sessionDateLabel: "Session date",
    attendanceCodeLabel: "Attendance code",
    googleFormUrlLabel: "Roll-call Google Form URL",
    googleFormUrlPlaceholder: "https://docs.google.com/forms/d/e/.../viewform",
    googleFormUrlMissing: "Not set",
    changeFormUrl: "Change",
    createSession: "Create session",
    status: "Status",
    statusDraft: "Draft",
    statusOpen: "Open",
    statusClosed: "Closed",
    openAttendance: "Open attendance",
    closeAttendance: "Close attendance",
    changeCode: "Change code",
    save: "Save",
    cancel: "Cancel",
    joinUrlLabel: "Student join link",
    copyJoinUrl: "Copy link",
    copied: "Copied",
    noSessions: "No sessions yet.",
    rollCallNote:
      "Attendance is recorded in this Form's linked Google Sheet, not in ShowOff — check there for who attended.",
  },
  common: {
    loading: "Loading…",
    error: "Error",
    back: "Back",
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
    codeLabel: "הקוד של היום",
    formInstructions: "הזינו את שמכם ואת הקוד שלמעלה בטופס שמופיע למטה.",
    formMissing: "עדיין לא הוגדר טופס נוכחות למפגש הזה.",
    continueButton: "המשך לשיעור",
  },
  studio: {
    signInTitle: "כניסת מרצה",
    emailLabel: "אימייל",
    emailPlaceholder: "you@university.edu",
    sendLink: "שלחו קישור כניסה",
    checkEmail: "בדקו את תיבת הדוא\"ל שלכם לקישור כניסה.",
    signOut: "התנתקות",
    coursesTitle: "קורסים",
    newCourseNamePlaceholder: "שם הקורס",
    createCourse: "יצירת קורס",
    noCourses: "אין עדיין קורסים.",
    sessionsTitle: "מפגשים",
    newSessionTitle: "מפגש חדש",
    sessionTitleLabel: "כותרת המפגש",
    sessionTitlePlaceholder: "לדוגמה: הרצאה 3",
    sessionDateLabel: "תאריך המפגש",
    attendanceCodeLabel: "קוד נוכחות",
    googleFormUrlLabel: "קישור לטופס הנוכחות ב-Google",
    googleFormUrlPlaceholder: "https://docs.google.com/forms/d/e/.../viewform",
    googleFormUrlMissing: "לא הוגדר",
    changeFormUrl: "שינוי",
    createSession: "יצירת מפגש",
    status: "סטטוס",
    statusDraft: "טיוטה",
    statusOpen: "פתוח",
    statusClosed: "סגור",
    openAttendance: "פתיחת נוכחות",
    closeAttendance: "סגירת נוכחות",
    changeCode: "שינוי קוד",
    save: "שמירה",
    cancel: "ביטול",
    joinUrlLabel: "קישור הצטרפות לסטודנטים",
    copyJoinUrl: "העתקת קישור",
    copied: "הועתק",
    noSessions: "אין עדיין מפגשים.",
    rollCallNote: "הנוכחות נשמרת בגיליון ה-Google Sheets המקושר לטופס, ולא ב-ShowOff — שם תוכלו לבדוק מי הגיע.",
  },
  common: {
    loading: "טוען…",
    error: "שגיאה",
    back: "חזרה",
  },
};

export const dictionaries: Record<Language, Dictionary> = { en, he };
