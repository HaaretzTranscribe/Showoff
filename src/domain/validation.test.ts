import { describe, expect, it } from "vitest";
import { createSessionSchema, googleFormUrlSchema, sessionSlugSchema } from "./validation";

describe("sessionSlugSchema", () => {
  it("accepts a lowercase, hyphenated slug", () => {
    expect(sessionSlugSchema.safeParse("data-storytelling-2026-08-28-ab12").success).toBe(true);
  });

  it("rejects uppercase or spaces", () => {
    expect(sessionSlugSchema.safeParse("Data Storytelling").success).toBe(false);
  });
});

describe("googleFormUrlSchema", () => {
  it("accepts a Google Forms URL", () => {
    expect(
      googleFormUrlSchema.safeParse("https://docs.google.com/forms/d/e/abc123/viewform").success
    ).toBe(true);
  });

  it("rejects a non-URL", () => {
    expect(googleFormUrlSchema.safeParse("not a url").success).toBe(false);
  });
});

describe("createSessionSchema", () => {
  it("requires a valid Google Form URL", () => {
    const result = createSessionSchema.safeParse({
      courseId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      title: "Lecture 3",
      sessionDate: "2026-08-28",
      attendanceCode: "AB12",
      googleFormUrl: "not a url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed session", () => {
    const result = createSessionSchema.safeParse({
      courseId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      title: "Lecture 3",
      sessionDate: "2026-08-28",
      attendanceCode: "AB12",
      googleFormUrl: "https://docs.google.com/forms/d/e/abc123/viewform",
    });
    expect(result.success).toBe(true);
  });
});
