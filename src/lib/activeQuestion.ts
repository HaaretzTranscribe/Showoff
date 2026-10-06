import type { ActiveQuestionState } from "@/domain/types";

/** Client for the /api/active-question Netlify Function (netlify/functions/active-question.mts). */
export async function getActiveQuestion(lessonKey: string): Promise<ActiveQuestionState | null> {
  try {
    const response = await fetch(`/api/active-question?lesson=${encodeURIComponent(lessonKey)}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data ?? null;
  } catch {
    return null;
  }
}

const PASSWORD_KEY = "showoff:instructor-password";

function storedPassword(): string {
  try {
    return window.localStorage.getItem(PASSWORD_KEY) ?? "";
  } catch {
    return "";
  }
}

function storePassword(password: string) {
  try {
    window.localStorage.setItem(PASSWORD_KEY, password);
  } catch {
    // Private mode etc. — the password just won't be remembered.
  }
}

/**
 * Changing the live question needs the instructor password (see
 * netlify/functions/active-question.mts). It's asked for once, only when
 * the server rejects the remembered one, and then kept in this browser
 * for good — so it never interrupts a lesson on an already-used machine.
 */
export async function setActiveQuestion(
  lessonKey: string,
  question: { formUrl: string; title: string; questionNumber: string } | null
): Promise<boolean> {
  let password = storedPassword();
  for (;;) {
    let response: Response;
    try {
      response = await fetch("/api/active-question", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-instructor-password": password },
        body: JSON.stringify({
          lesson: lessonKey,
          formUrl: question?.formUrl ?? null,
          title: question?.title ?? null,
          questionNumber: question?.questionNumber ?? null,
        }),
      });
    } catch {
      return false;
    }
    if (response.status !== 401) return response.ok;

    const entered = window.prompt("סיסמת מרצה / Instructor password");
    if (entered === null) return false;
    password = entered.trim();
    storePassword(password);
  }
}
