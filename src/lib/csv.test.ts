import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvRecords } from "./csv";

describe("parseCsv", () => {
  it("splits simple comma-separated rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    expect(parseCsv('a,"b, and c",d')).toEqual([["a", "b, and c", "d"]]);
  });

  it("handles escaped double quotes inside quoted fields", () => {
    expect(parseCsv('a,"she said ""hi""",c')).toEqual([["a", 'she said "hi"', "c"]]);
  });

  it("handles quoted fields containing newlines", () => {
    expect(parseCsv('a,"line1\nline2",c')).toEqual([["a", "line1\nline2", "c"]]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsvRecords", () => {
  it("keys rows by normalized header", () => {
    const csv = "Course Name,Session Date,Google Form URL\nData 101,2026-08-28,https://example.com/form";
    expect(parseCsvRecords(csv)).toEqual([
      {
        course_name: "Data 101",
        session_date: "2026-08-28",
        google_form_url: "https://example.com/form",
      },
    ]);
  });

  it("skips blank rows", () => {
    const csv = "a,b\n1,2\n,\n3,4";
    expect(parseCsvRecords(csv)).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("returns an empty array for header-only input", () => {
    expect(parseCsvRecords("a,b")).toEqual([]);
  });
});
