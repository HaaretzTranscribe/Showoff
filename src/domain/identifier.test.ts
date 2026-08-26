import { describe, it, expect } from "vitest";
import { normalizeIdentifier, isPlausibleIdentifier } from "./identifier";

describe("normalizeIdentifier", () => {
  it("strips separators and pads numeric IDs to 9 digits", () => {
    expect(normalizeIdentifier(" 123-45-678 ")).toBe("012345678");
  });

  it("preserves already-9-digit numeric IDs", () => {
    expect(normalizeIdentifier("123456789")).toBe("123456789");
  });

  it("uppercases non-numeric institutional identifiers", () => {
    expect(normalizeIdentifier(" stu.2024-007 ")).toBe("STU2024007");
  });

  it("treats different formatting of the same ID as equal", () => {
    expect(normalizeIdentifier("123-456-782")).toBe(normalizeIdentifier("123456782"));
  });
});

describe("isPlausibleIdentifier", () => {
  it("rejects too-short input", () => {
    expect(isPlausibleIdentifier("1")).toBe(false);
  });

  it("accepts a reasonable identifier", () => {
    expect(isPlausibleIdentifier("123456789")).toBe(true);
  });
});
