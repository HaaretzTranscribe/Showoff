import { describe, expect, it } from "vitest";
import { viz1, viz3, viz5, viz9, viz10, viz11 } from "./lesson1Visualizations";
import type { ResponseTable } from "@/lib/responses";

function table(rows: string[][]): ResponseTable {
  return { headers: [], rows };
}

describe("viz1 — Q1 Yes/No as % of respondents", () => {
  it("computes percentage of each option", () => {
    const result = viz1(table([["t", "כן"], ["t", "כן"], ["t", "לא"]]));
    expect(result).toEqual([
      { label: "כן", value: 67 },
      { label: "לא", value: 33 },
    ]);
  });
});

describe("viz3 — Q2 positive/negative collapse, as %", () => {
  it("groups the top two levels as positive and bottom two as negative", () => {
    const rows = [
      ["t", "מרוצה מאוד"],
      ["t", "מרוצה חלקית"],
      ["t", "לא כל כך מרוצה"],
      ["t", "לא מרוצה כלל"],
      ["t", "לא מרוצה כלל"],
    ];
    const result = viz3(table(rows));
    expect(result.find((r) => r.label === "חיובי")?.value).toBe(40);
    expect(result.find((r) => r.label === "שלילי")?.value).toBe(60);
  });
});

describe("viz5 — % dissatisfied per transport method", () => {
  it("computes percentage negative within each method group", () => {
    const rows = [
      ["t", "מרוצה מאוד", "באוטובוס"],
      ["t", "לא מרוצה כלל", "באוטובוס"],
      ["t", "מרוצה חלקית", "ברגל"],
    ];
    const result = viz5(table(rows));
    expect(result.find((r) => r.label === "באוטובוס")?.value).toBe(50);
    expect(result.find((r) => r.label === "ברגל")?.value).toBe(0);
  });

  it("skips rows missing method or satisfaction", () => {
    const result = viz5(table([["t", "", "באוטובוס"], ["t", "מרוצה מאוד", ""]]));
    expect(result).toEqual([]);
  });
});

describe("viz9 — % dissatisfied per time quartile", () => {
  it("splits into 4 roughly-equal groups ordered by time, labeled with their range", () => {
    // 8 rows -> 2 per quartile; times 1..8, negative only for the slowest 2
    const rows = Array.from({ length: 8 }, (_, i) => {
      const time = String(i + 1);
      const satisfaction = i >= 6 ? "לא מרוצה כלל" : "מרוצה מאוד";
      return ["t", satisfaction, "", "", time];
    });
    const result = viz9(table(rows));
    expect(result).toHaveLength(4);
    expect(result[0].value).toBe(0); // fastest quartile, all satisfied
    expect(result[0].label).toContain("1-2");
    expect(result[3].value).toBe(100); // slowest quartile, both dissatisfied
    expect(result[3].label).toContain("7-8");
  });

  it("returns an empty array when no time values are parseable", () => {
    expect(viz9(table([["t", "מרוצה מאוד", "", "", "not a number"]]))).toEqual([]);
  });
});

describe("viz10 — scatter groups by satisfaction, excluding time outliers", () => {
  it("excludes the single highest-time and single lowest-time response", () => {
    const rows = [
      ["t", "מרוצה מאוד", "", "500", "5"], // lowest time -> excluded
      ["t", "מרוצה מאוד", "", "600", "20"],
      ["t", "מרוצה חלקית", "", "650", "30"],
      ["t", "לא מרוצה כלל", "", "700", "40"],
      ["t", "לא מרוצה כלל", "", "900", "99"], // highest time -> excluded
    ];
    const groups = viz10(table(rows));
    const allPoints = groups.flatMap((g) => g.points);
    expect(allPoints).toHaveLength(3);
    expect(allPoints.some((p) => p.x === 5)).toBe(false);
    expect(allPoints.some((p) => p.x === 99)).toBe(false);
  });

  it("buckets very-positive, mixed, and very-negative separately", () => {
    const rows = [
      ["t", "מרוצה מאוד", "", "500", "20"],
      ["t", "מרוצה חלקית", "", "600", "30"],
      ["t", "לא מרוצה כלל", "", "700", "40"],
    ];
    // Only 3 rows: min/max time excluded, leaving just the middle (mixed) point.
    const groups = viz10(table(rows));
    const allPoints = groups.flatMap((g) => g.points);
    expect(allPoints).toEqual([{ x: 30, y: 600 }]);
  });
});

describe("viz11 — three worst experiences", () => {
  it("prefers the most recent very-negative responses", () => {
    const rows = [
      ["t", "לא מרוצה כלל", "old bad one"],
      ["t", "מרוצה מאוד", "irrelevant"],
      ["t", "לא מרוצה כלל", "recent bad one"],
      ["t", "לא מרוצה כלל", "most recent bad one"],
    ];
    const result = viz11(table(rows));
    expect(result).toEqual(["most recent bad one", "recent bad one", "old bad one"]);
  });

  it("falls back to the next-worst level when fewer than 3 very-negative exist", () => {
    const rows = [
      ["t", "לא מרוצה כלל", "the one bad one"],
      ["t", "לא כל כך מרוצה", "somewhat bad"],
    ];
    const result = viz11(table(rows));
    expect(result).toEqual(["the one bad one", "somewhat bad"]);
  });

  it("strips a trailing period but leaves other punctuation alone", () => {
    const rows = [
      ["t", "לא מרוצה כלל", "היה נורא."],
      ["t", "לא מרוצה כלל", "למה זה קורה?"],
    ];
    const result = viz11(table(rows));
    expect(result).toEqual(["למה זה קורה?", "היה נורא"]);
  });

  it("returns an empty array when there are no responses", () => {
    expect(viz11(table([]))).toEqual([]);
  });

  it("excludes a stock no-complaint phrase even when tagged very-negative", () => {
    const rows = [
      ["t", "לא מרוצה כלל", "הכל טוב"],
      ["t", "לא מרוצה כלל", "אני נוסע שעה בפקקים כל יום וזה בלתי נסבל"],
    ];
    const result = viz11(table(rows));
    expect(result).toEqual(["אני נוסע שעה בפקקים כל יום וזה בלתי נסבל"]);
  });

  it("keeps a short but genuinely negative quote (not filtered by length)", () => {
    const rows = [["t", "לא מרוצה כלל", "הכל ממש זוועה"]];
    const result = viz11(table(rows));
    expect(result).toEqual(["הכל ממש זוועה"]);
  });
});
