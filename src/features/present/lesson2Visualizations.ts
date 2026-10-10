import type { ResponseTable } from "@/lib/responses";
import type { Language } from "@/i18n/translations";
import type { BarDatum } from "./charts/BarChartCard";

// Lesson 2's Forms each have a single question, in column 1 (0 = Timestamp):
// Q1 and Q3 are Yes/No, Q2 and Q4 pick one data source from a list, Q5 is
// free text. The same functions serve the Hebrew (2) and English (2e) runs.
const ANSWER_COL = 1;

const BLUE = "#1d4ed8";
const RED = "#dc2626";
const YES = ["כן", "Yes"];
const NO = ["לא", "No"];

function answers(table: ResponseTable): string[] {
  return table.rows.map((row) => (row[ANSWER_COL] ?? "").trim()).filter(Boolean);
}

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Yes/No as % of respondents, Yes first (blue) then No (red). */
export function yesNoBars(table: ResponseTable, lang: Language): BarDatum[] {
  const all = answers(table);
  const yes = all.filter((a) => YES.includes(a)).length;
  const no = all.filter((a) => NO.includes(a)).length;
  return [
    { label: lang === "en" ? "Yes" : "כן", value: percent(yes, all.length), color: BLUE },
    { label: lang === "en" ? "No" : "לא", value: percent(no, all.length), color: RED },
  ];
}

export interface ChoiceShare {
  label: string;
  value: number;
  count: number;
}

/** Strips list-marker leftovers some options were typed with (e.g. "- What share…"). */
function cleanLabel(raw: string): string {
  return raw.replace(/^[\s\-–—•]+/, "").trim();
}

/** Each option's % of respondents, most-picked first. */
export function choiceShares(table: ResponseTable): ChoiceShare[] {
  const all = answers(table);
  const counts = new Map<string, number>();
  for (const answer of all) {
    const label = cleanLabel(answer);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count, value: percent(count, all.length) }))
    .sort((a, b) => b.count - a.count);
}

export interface TextAnswer {
  /** Stable across polls, so already-shown answers don't re-animate. */
  key: string;
  text: string;
}

/** Free-text answers, newest first. */
export function textAnswers(table: ResponseTable): TextAnswer[] {
  return table.rows
    .map((row, i) => ({ key: `${row[0] ?? ""}|${i}`, text: (row[ANSWER_COL] ?? "").trim() }))
    .filter((a) => a.text)
    .reverse();
}
