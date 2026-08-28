import { describe, expect, it } from "vitest";
import {
  isPlausibleName,
  normalizeAttendanceCode,
  normalizeName,
  fullNameSchema,
} from "./validation";

describe("normalizeName", () => {
  it("trims leading/trailing whitespace", () => {
    expect(normalizeName("  David Cohen  ")).toBe("david cohen");
  });

  it("collapses repeated internal whitespace", () => {
    expect(normalizeName("David   Cohen")).toBe("david cohen");
  });

  it("is case-insensitive", () => {
    expect(normalizeName("DAVID COHEN")).toBe(normalizeName("david cohen"));
  });

  it("treats retyping variants as the same normalized name", () => {
    expect(normalizeName(" David  Cohen")).toBe(normalizeName("david cohen "));
  });
});

describe("isPlausibleName", () => {
  it("rejects empty input", () => {
    expect(isPlausibleName("")).toBe(false);
  });

  it("rejects a single character", () => {
    expect(isPlausibleName("D")).toBe(false);
  });

  it("rejects digit-only input", () => {
    expect(isPlausibleName("12345")).toBe(false);
  });

  it("accepts a normal name", () => {
    expect(isPlausibleName("David Cohen")).toBe(true);
  });

  it("accepts a Hebrew name", () => {
    expect(isPlausibleName("דוד כהן")).toBe(true);
  });
});

describe("normalizeAttendanceCode", () => {
  it("uppercases and strips whitespace", () => {
    expect(normalizeAttendanceCode(" ab12 ")).toBe("AB12");
  });
});

describe("fullNameSchema", () => {
  it("rejects too-short input", () => {
    expect(fullNameSchema.safeParse("D").success).toBe(false);
  });

  it("rejects input with no letters", () => {
    expect(fullNameSchema.safeParse("1234").success).toBe(false);
  });

  it("accepts a plausible name", () => {
    expect(fullNameSchema.safeParse("David Cohen").success).toBe(true);
  });
});
