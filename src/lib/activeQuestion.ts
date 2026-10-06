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

export function rememberInstructorPassword(password: string) {
  storePassword(password);
}

/**
 * Checks a password against the server (netlify/functions/active-question.mts).
 * With no argument, checks the one this browser remembers. Also true when
 * the site has no INSTRUCTOR_PASSWORD set.
 */
export async function verifyInstructorPassword(password = storedPassword()): Promise<boolean> {
  try {
    const response = await fetch("/api/active-question", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-instructor-password": password },
      body: JSON.stringify({ verifyOnly: true }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Changing the live question; sends the password this browser remembers. */
export async function setActiveQuestion(
  lessonKey: string,
  question: { formUrl: string; title: string; questionNumber: string } | null
): Promise<boolean> {
  try {
    const response = await fetch("/api/active-question", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-instructor-password": storedPassword() },
      body: JSON.stringify({
        lesson: lessonKey,
        formUrl: question?.formUrl ?? null,
        title: question?.title ?? null,
        questionNumber: question?.questionNumber ?? null,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
