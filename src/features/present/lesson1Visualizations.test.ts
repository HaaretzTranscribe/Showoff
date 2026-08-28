import { describe, expect, it } from "vitest";
import { viz1, viz3, viz5, viz9, viz10, viz11 } from "./lesson1Visualizations";
import type { ResponseTable } from "@/lib/responses";

function table(rows: string[][]): ResponseTable {
  return { headers: [], rows };
}

describe("viz1 — Q1 Yes/No counts", () => {
  it("tallies each option", () => {
    const result = viz1(table([["t", "כן"], ["t", "כן"], ["t", "לא"]]));
    expect(result).toEqual([
      { label: "כן", value: 2 },
      { label: "לא", value: 1 },
    ]);
  });
});

describe("viz3 — Q2 positive/negative collapse", () => {
  it("groups the top two levels as positive and bottom two as negative", () => {
    const rows = [
      ["t", "מרוצה מאוד"],
      ["t", "מרוצה חלקית"],
      ["t", "לא כל כך מרוצה"],
      ["t", "לא מרוצה כלל"],
      ["t", "לא מרוצה כלל"],
    ];
    const result = viz3(table(rows));
    expect(result.find((r) => r.label === "חיובי")?.value).toBe(2);
    expect(result.find((r) => r.label === "שלילי")?.value).toBe(3);
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
  it("splits into 4 roughly-equal groups ordered by time", () => {
    // 8 rows -> 2 per quartile; times 1..8, negative only for the slowest 2
    const rows = Array.from({ length: 8 }, (_, i) => {
      const time = String(i + 1);
      const satisfaction = i >= 6 ? "לא מרוצה כלל" : "מרוצה מאוד";
      return ["t", satisfaction, "", "", time];
    });
    const result = viz9(table(rows));
    expect(result).toHaveLength(4);
    expect(result[0].value).toBe(0); // fastest quartile, all satisfied
    expect(result[3].value).toBe(100); // slowest quartile, both dissatisfied
  });

  it("returns an empty array when no time values are parseable", () => {
    expect(viz9(table([["t", "מרוצה מאוד", "", "", "not a number"]]))).toEqual([]);
  });
});

describe("viz10 — scatter groups by satisfaction", () => {
  it("buckets very-positive, mixed, and very-negative separately", () => {
    const rows = [
      ["t", "מרוצה מאוד", "", "500", "20"],
      ["t", "מרוצה חלקית", "", "600", "30"],
      ["t", "לא מרוצה כלל", "", "700", "40"],
    ];
    const groups = viz10(table(rows));
    expect(groups.map((g) => g.name)).toEqual([
      "מרוצה מאוד",
      "מרוצה חלקית / לא כל כך מרוצה",
      "לא מרוצה כלל",
    ]);
    expect(groups[0].points).toEqual([{ x: 20, y: 500 }]);
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

  it("returns an empty array when there are no responses", () => {
    expect(viz11(table([]))).toEqual([]);
  });
});
