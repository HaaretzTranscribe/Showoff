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
    fullNameLabel: string;
    fullNamePlaceholder: string;
    attendanceCodeLabel: string;
    attendanceCodePlaceholder: string;
    submit: string;
    submitting: string;
    confirmedTitle: string;
    alreadyRecordedTitle: string;
    continueButton: string;
    errorInvalidCode: string;
    errorNameTooShort: string;
    errorGeneric: string;
    errorNetwork: string;
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
    attendeeCount: string;
    attendanceListTitle: string;
    exportCsv: string;
    addAttendee: string;
    addAttendeePlaceholder: string;
    add: string;
    remove: string;
    joinUrlLabel: string;
    copyJoinUrl: string;
    copied: string;
    noAttendees: string;
    noSessions: string;
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
    fullNameLabel: "Full name",
    fullNamePlaceholder: "Your full name",
    attendanceCodeLabel: "Attendance code",
    attendanceCodePlaceholder: "Code",
    submit: "Enter class",
    submitting: "Submitting…",
    confirmedTitle: "Attendance recorded ✓",
    alreadyRecordedTitle: "Attendance already recorded",
    continueButton: "Continue to class",
    errorInvalidCode: "Wrong attendance code",
    errorNameTooShort: "Please enter your full name",
    errorGeneric: "Something went wrong. Please try again.",
    errorNetwork: "Network error. Please check your connection and try again.",
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
    attendeeCount: "attendees",
    attendanceListTitle: "Attendance",
    exportCsv: "Export CSV",
    addAttendee: "Add attendee",
    addAttendeePlaceholder: "Full name",
    add: "Add",
    remove: "Remove",
    joinUrlLabel: "Student join link",
    copyJoinUrl: "Copy link",
    copied: "Copied",
    noAttendees: "No attendance recorded yet.",
    noSessions: "No sessions yet.",
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
    fullNameLabel: "שם מלא",
    fullNamePlaceholder: "השם המלא שלך",
    attendanceCodeLabel: "קוד נוכחות",
    attendanceCodePlaceholder: "קוד",
    submit: "כניסה לשיעור",
    submitting: "שולח…",
    confirmedTitle: "הנוכחות נרשמה ✓",
    alreadyRecordedTitle: "הנוכחות כבר נרשמה",
    continueButton: "המשך לשיעור",
    errorInvalidCode: "קוד נוכחות שגוי",
    errorNameTooShort: "נא להזין שם מלא",
    errorGeneric: "משהו השתבש. נסו שוב.",
    errorNetwork: "שגיאת רשת. בדקו את החיבור ונסו שוב.",
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
    attendeeCount: "נוכחים",
    attendanceListTitle: "נוכחות",
    exportCsv: "ייצוא CSV",
    addAttendee: "הוספת נוכח",
    addAttendeePlaceholder: "שם מלא",
    add: "הוספה",
    remove: "הסרה",
    joinUrlLabel: "קישור הצטרפות לסטודנטים",
    copyJoinUrl: "העתקת קישור",
    copied: "הועתק",
    noAttendees: "עדיין לא נרשמה נוכחות.",
    noSessions: "אין עדיין מפגשים.",
  },
  common: {
    loading: "טוען…",
    error: "שגיאה",
    back: "חזרה",
  },
};

export const dictionaries: Record<Language, Dictionary> = { en, he };
