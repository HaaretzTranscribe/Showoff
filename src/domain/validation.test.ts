import { describe, it, expect } from "vitest";
import {
  bilingualTextSchema,
  createQuestionSchema,
  joinRequestSchema,
  sceneConfigSchema,
  stableKeySchema,
} from "./validation";

describe("bilingualTextSchema", () => {
  it("accepts a lesson title with only Hebrew (unilingual lesson, spec 2.3)", () => {
    const result = bilingualTextSchema.safeParse({ he: "שיעור פתיחה", en: "" });
    expect(result.success).toBe(true);
  });

  it("rejects when both languages are empty", () => {
    const result = bilingualTextSchema.safeParse({ he: "", en: "" });
    expect(result.success).toBe(false);
  });
});

describe("stableKeySchema", () => {
  it("accepts snake_case keys", () => {
    expect(stableKeySchema.safeParse("q_sleep_hours").success).toBe(true);
  });

  it("rejects keys starting with a digit or containing spaces", () => {
    expect(stableKeySchema.safeParse("1_bad").success).toBe(false);
    expect(stableKeySchema.safeParse("bad key").success).toBe(false);
  });
});

describe("createQuestionSchema", () => {
  const base = {
    lessonId: "11111111-1111-4111-8111-111111111111",
    stableKey: "q_sleep_hours",
    prompt: { he: "כמה שעות שינה?", en: "How many hours of sleep?" },
    orderIndex: 0,
  };

  it("validates a scale question requires min/max/step in config", () => {
    const missingConfig = createQuestionSchema.safeParse({
      ...base,
      type: "scale",
      config: { required: true },
    });
    expect(missingConfig.success).toBe(false);

    const valid = createQuestionSchema.safeParse({
      ...base,
      type: "scale",
      config: { required: true, min: 1, max: 5, step: 1 },
    });
    expect(valid.success).toBe(true);
  });

  it("validates multiple_choice minSelections/maxSelections are non-negative", () => {
    const result = createQuestionSchema.safeParse({
      ...base,
      type: "multiple_choice",
      config: { required: false, minSelections: -1 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts yes_no with just the base config", () => {
    const result = createQuestionSchema.safeParse({
      ...base,
      type: "yes_no",
      config: { required: true },
    });
    expect(result.success).toBe(true);
  });
});

describe("joinRequestSchema", () => {
  it("uppercases and validates the attendance code", () => {
    const result = joinRequestSchema.safeParse({
      sessionId: "11111111-1111-4111-8111-111111111111",
      studentIdentifier: "123456789",
      attendanceCode: "ab3d9k",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attendanceCode).toBe("AB3D9K");
    }
  });

  it("rejects codes with invalid characters or length", () => {
    const result = joinRequestSchema.safeParse({
      sessionId: "11111111-1111-4111-8111-111111111111",
      studentIdentifier: "123456789",
      attendanceCode: "!!",
    });
    expect(result.success).toBe(false);
  });
});

describe("sceneConfigSchema", () => {
  it("accepts the spec's example scene config (section 24) once versioned", () => {
    const result = sceneConfigSchema.safeParse({
      schemaVersion: 1,
      name: { he: "שינה מול מסך", en: "Sleep vs screen time" },
      chartType: "scatter",
      bindings: { x: "q_sleep_hours", y: "q_screen_hours", color: "q_gender" },
      aggregation: "none",
      filters: [],
      outlierControls: { enabled: true, manual: true, iqr: true, percentile: true },
      display: { showSampleSize: true, legend: true },
      transition: "morph",
      privacy: { minGroupSize: 5 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unversioned or unknown chart type", () => {
    const result = sceneConfigSchema.safeParse({
      schemaVersion: 2,
      name: { he: "x", en: "x" },
      chartType: "pie3d",
      bindings: {},
      aggregation: "none",
      filters: [],
      outlierControls: { enabled: false, manual: false, iqr: false, percentile: false },
      display: { showSampleSize: false, legend: false },
      transition: "instant",
      privacy: { minGroupSize: 0 },
    });
    expect(result.success).toBe(false);
  });
});
