import { describe, expect, it } from "vitest";
import { choiceShares, textAnswers, yesNoBars } from "./lesson2Visualizations";
import type { ResponseTable } from "@/lib/responses";

function table(rows: string[][]): ResponseTable {
  return { headers: [], rows };
}

describe("yesNoBars", () => {
  it("gives Yes then No as % of respondents, in the lesson's language", () => {
    const rows = [["t", "כן"], ["t", "כן"], ["t", "כן"], ["t", "לא"]];
    expect(yesNoBars(table(rows), "he").map((b) => [b.label, b.value])).toEqual([
      ["כן", 75],
      ["לא", 25],
    ]);
    expect(yesNoBars(table([["t", "No"]]), "en").map((b) => [b.label, b.value])).toEqual([
      ["Yes", 0],
      ["No", 100],
    ]);
  });
});

describe("choiceShares", () => {
  it("ranks options by how often they were picked, as % of respondents", () => {
    const rows = [["t", "A"], ["t", "B"], ["t", "B"], ["t", "C"], ["t", "B"]];
    expect(choiceShares(table(rows))).toEqual([
      { label: "B", count: 3, value: 60 },
      { label: "A", count: 1, value: 20 },
      { label: "C", count: 1, value: 20 },
    ]);
  });

  it("lists options nobody picked at 0%, after the picked ones", () => {
    const shares = choiceShares(table([["t", "B"]]), ["A", "B", "C"]);
    expect(shares.map((s) => [s.label, s.value])).toEqual([
      ["B", 100],
      ["A", 0],
      ["C", 0],
    ]);
  });

  it("strips a leading list marker from option text", () => {
    expect(choiceShares(table([["t", "- What share of the homes?"]]))[0].label).toBe("What share of the homes?");
  });
});

describe("textAnswers", () => {
  it("returns non-empty answers newest first", () => {
    const rows = [["t1", "first"], ["t2", "  "], ["t3", "third"]];
    expect(textAnswers(table(rows)).map((a) => a.text)).toEqual(["third", "first"]);
  });
});
