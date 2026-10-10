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

/** Q2 and Q4 options, in Form order, as cleanLabel() leaves them. */
export const CHOICES: Record<string, Record<Language, string[]>> = {
  "2": {
    he: [
      "מהם מחיר הדירה הממוצעת בישראל היום מאשר לפני 20 שנה?",
      "מה ההכנסה הממוצעת של צעיר ישראלי בגיל 25?",
      "לכמה צעירים יש היום דירה בבעלותם?",
      "על מה צעירים מוציאים את הכסף שלהם היום?",
      "מה נתח הדירות הקטנות מבין כלל הדירות המוצעות בשוק?",
    ],
    en: [
      "What is the average price of an apartment in Israel today compared with 20 years ago?",
      "What is the average income of a 25-year-old Israeli?",
      "How many young people own a home today?",
      "What do young people spend their money on today?",
      "What share of the homes on the market are small apartments?",
    ],
  },
  "4": {
    he: ["מספר הרוגים/ות", "מספר פצועים/ות", "מספר תאונות", 'מספר דו"חות משטרה/רשות מקומית', "חוות דעתם/ן של תושבים/ות"],
    en: [
      "Number of fatalities from accidents on sidewalks",
      "Number of people injured in accidents on sidewalks",
      "Number of accidents on sidewalks",
      "Number of police/local authority reports",
      "Residents’ opinions",
    ],
  },
};

/**
 * Each option's % of respondents, most-picked first. Every option in
 * `options` is listed, at 0% if nobody picked it (ties keep Form order);
 * an answer outside the list is still counted and shown.
 */
export function choiceShares(table: ResponseTable, options: string[] = []): ChoiceShare[] {
  const all = answers(table);
  const counts = new Map<string, number>(options.map((o) => [o, 0]));
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
