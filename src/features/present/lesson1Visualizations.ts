import { parseLenientNumber, type ResponseTable } from "@/lib/responses";
import type { Language } from "@/i18n/translations";
import type { BarDatum } from "./charts/BarChartCard";
import type { ScatterGroup } from "./charts/ScatterChartCard";

// Column positions in each question's response CSV (0 = Timestamp),
// fixed by inspecting the actual Forms for lesson 1 — see
// docs/phase_2_addendum_visualizations.md.
const COL = {
  q1: { satisfaction: 1 },
  q2: { satisfaction: 1 },
  q3: { satisfaction: 1, method: 2 },
  q4: { satisfaction: 1, method: 2, cost: 3, time: 4 },
  q5: { satisfaction: 1, experience: 2, method: 3, cost: 4, time: 5 },
};

/**
 * Per-language answer texts and chart labels. The English lesson (lesson
 * key ending in "en", see lessonLanguage) runs the same Forms translated,
 * so its Form options must match the `en` satisfaction strings exactly —
 * the Hebrew ones are the original lesson-1 Form options.
 */
interface LessonText {
  /** Satisfaction scale, most pleased first: very / somewhat / not very / not at all. */
  satisfaction: [string, string, string, string];
  pleasedSomehow: string;
  notPleasedAtAll: string;
  veryPleased: string;
  notPleasedSomehow: string;
  mixed: string;
  minutes: string;
  quartile: string;
  yesNo: [string, string];
  /** Q3/Q4/Q5 transport options, in Form order. */
  transport: string[];
  noComplaintPhrases: string[];
}

const TEXT: Record<Language, LessonText> = {
  he: {
    satisfaction: ["מרוצה מאוד", "מרוצה חלקית", "לא כל כך מרוצה", "לא מרוצה כלל"],
    pleasedSomehow: "מרוצים ברמה כלשהי",
    notPleasedAtAll: "לא מרוצים כלל",
    veryPleased: "מרוצים מאוד",
    notPleasedSomehow: "לא מרוצים ברמה כלשהי",
    mixed: "מרוצה חלקית / לא כל כך מרוצה",
    minutes: "דקות",
    quartile: "רבעון",
    yesNo: ["כן", "לא"],
    transport: ["באוטובוס", "במכונית פרטית", "ברגל", "באופניים", "באופניים חשמליים/קורקינט חשמלי", "אחר"],
    noComplaintPhrases: [
      "הכל טוב",
      "הכל בסדר",
      "הכל בסדר גמור",
      "בסדר גמור",
      "הכל כיף",
      "הכל מצוין",
      "הכל אחלה",
      "הכל נהדר",
      "אין תלונות",
    ],
  },
  en: {
    satisfaction: ["Very satisfied", "Somewhat satisfied", "Not very satisfied", "Not satisfied at all"],
    pleasedSomehow: "Satisfied to some degree",
    notPleasedAtAll: "Not satisfied at all",
    veryPleased: "Very satisfied",
    notPleasedSomehow: "Not satisfied to some degree",
    mixed: "Somewhat / not very satisfied",
    minutes: "min",
    quartile: "Quartile",
    yesNo: ["Yes", "No"],
    transport: ["By bus", "By private car", "On foot", "By bicycle", "By e-bike/e-scooter", "Other"],
    noComplaintPhrases: [
      "all good",
      "everything is good",
      "everything is fine",
      "everything's fine",
      "all fine",
      "fine",
      "no complaints",
      "none",
      "nothing",
    ],
  },
};

function levels(lang: Language) {
  const [veryPositive, somewhatPositive, somewhatNegative, veryNegative] = TEXT[lang].satisfaction;
  return {
    veryPositive,
    somewhatPositive,
    somewhatNegative,
    veryNegative,
    positive: [veryPositive, somewhatPositive],
    negative: [somewhatNegative, veryNegative],
  };
}

const BLUE = "#1d4ed8";
const RED = "#dc2626";
const PURPLE = "#7e22ce";

function countBy(rows: string[][], col: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = (row[col] ?? "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/**
 * Converts counts to % of the total (rounded), rather than nominal counts — vizzes 1-2 and 5 are all normalized so bars are comparable regardless of how many students have responded so far.
 * `order` lists every Form option, so an option nobody picked still gets a 0% bar; any answer outside it is appended.
 */
function toPercentBarData(counts: Map<string, number>, order?: string[]): BarDatum[] {
  const total = Array.from(counts.values()).reduce((sum, v) => sum + v, 0);
  const labels = order
    ? [...order, ...Array.from(counts.keys()).filter((k) => !order.includes(k))]
    : Array.from(counts.keys());
  return labels.map((label) => {
    const value = counts.get(label) ?? 0;
    return { label, value: total > 0 ? Math.round((value / total) * 100) : 0 };
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Viz 1 — bar chart, Q1's Yes/No as % of respondents. */
export function viz1(table: ResponseTable, lang: Language = "he"): BarDatum[] {
  return toPercentBarData(countBy(table.rows, COL.q1.satisfaction), TEXT[lang].yesNo);
}

/** Viz 2 — bar chart, Q2's 4-point satisfaction scale as % of respondents. */
export function viz2(table: ResponseTable, lang: Language = "he"): BarDatum[] {
  const { positive, negative } = levels(lang);
  return toPercentBarData(countBy(table.rows, COL.q2.satisfaction), [...positive, ...negative]);
}

/**
 * Viz 3 — same Q2 data, collapsed to the 3 most-pleased levels (grouped)
 * vs the single most-displeased level standing alone, as % of
 * respondents. Deliberately asymmetric (3-vs-1, not 2-vs-2 like the old
 * viz3 it replaces) — pairs with viz4's mirror-image grouping to show
 * how the same underlying data tells a different story depending on
 * which categories get lumped together.
 */
export function viz3(table: ResponseTable, lang: Language = "he"): BarDatum[] {
  const l = levels(lang);
  const counts = countBy(table.rows, COL.q2.satisfaction);
  const total = Array.from(counts.values()).reduce((sum, v) => sum + v, 0);
  const pleased = [l.veryPositive, l.somewhatPositive, l.somewhatNegative].reduce(
    (sum, k) => sum + (counts.get(k) ?? 0),
    0
  );
  const veryDispleased = counts.get(l.veryNegative) ?? 0;
  return [
    { label: TEXT[lang].pleasedSomehow, value: total > 0 ? Math.round((pleased / total) * 100) : 0, color: BLUE },
    { label: TEXT[lang].notPleasedAtAll, value: total > 0 ? Math.round((veryDispleased / total) * 100) : 0, color: RED },
  ];
}

/**
 * Viz 4 — mirror image of viz3: the 3 most-displeased levels (grouped)
 * vs the single most-pleased level standing alone, as % of respondents.
 */
export function viz4(table: ResponseTable, lang: Language = "he"): BarDatum[] {
  const l = levels(lang);
  const counts = countBy(table.rows, COL.q2.satisfaction);
  const total = Array.from(counts.values()).reduce((sum, v) => sum + v, 0);
  const veryPleased = counts.get(l.veryPositive) ?? 0;
  const displeased = [l.somewhatPositive, l.somewhatNegative, l.veryNegative].reduce(
    (sum, k) => sum + (counts.get(k) ?? 0),
    0
  );
  return [
    { label: TEXT[lang].veryPleased, value: total > 0 ? Math.round((veryPleased / total) * 100) : 0, color: BLUE },
    { label: TEXT[lang].notPleasedSomehow, value: total > 0 ? Math.round((displeased / total) * 100) : 0, color: RED },
  ];
}

/** Viz 5 — bar chart, Q3's transportation method as % of respondents. */
export function viz5(table: ResponseTable, lang: Language = "he"): BarDatum[] {
  return toPercentBarData(countBy(table.rows, COL.q3.method), TEXT[lang].transport);
}

/** Viz 6 — % dissatisfied per transportation method, from Q3. */
export function viz6(table: ResponseTable, lang: Language = "he"): BarDatum[] {
  const { negative: NEGATIVE } = levels(lang);
  const byMethod = new Map<string, { total: number; negative: number }>();
  for (const row of table.rows) {
    const method = (row[COL.q3.method] ?? "").trim();
    const satisfaction = (row[COL.q3.satisfaction] ?? "").trim();
    if (!method || !satisfaction) continue;
    const entry = byMethod.get(method) ?? { total: 0, negative: 0 };
    entry.total += 1;
    if (NEGATIVE.includes(satisfaction)) entry.negative += 1;
    byMethod.set(method, entry);
  }
  return Array.from(byMethod.entries()).map(([label, { total, negative }]) => ({
    label,
    value: total > 0 ? Math.round((negative / total) * 100) : 0,
  }));
}

function costTimeRows(
  table: ResponseTable
): { satisfaction: string; method: string; cost: number | null; time: number | null }[] {
  return table.rows.map((row) => ({
    satisfaction: (row[COL.q4.satisfaction] ?? "").trim(),
    method: (row[COL.q4.method] ?? "").trim(),
    cost: parseLenientNumber(row[COL.q4.cost] ?? ""),
    time: parseLenientNumber(row[COL.q4.time] ?? ""),
  }));
}

/** Viz 7 — big number, average monthly cost from Q4. */
export function viz7(table: ResponseTable): number {
  const costs = costTimeRows(table)
    .map((r) => r.cost)
    .filter((c): c is number => c !== null);
  return mean(costs);
}

/** Viz 8 — big number, median monthly cost from Q4. */
export function viz8(table: ResponseTable): number {
  const costs = costTimeRows(table)
    .map((r) => r.cost)
    .filter((c): c is number => c !== null);
  return median(costs);
}

/** Viz 9 — big number, median commute time from Q4. */
export function viz9(table: ResponseTable): number {
  const times = costTimeRows(table)
    .map((r) => r.time)
    .filter((t): t is number => t !== null);
  return median(times);
}

/** Viz 10 — % dissatisfied per quartile of commute time, from Q4. */
export function viz10(table: ResponseTable, lang: Language = "he"): BarDatum[] {
  const { negative: NEGATIVE } = levels(lang);
  const { minutes, quartile } = TEXT[lang];
  const rows = costTimeRows(table).filter((r) => r.time !== null) as {
    satisfaction: string;
    time: number;
  }[];
  if (rows.length === 0) return [];

  const sorted = [...rows].sort((a, b) => a.time - b.time);
  const quartileCount = 4;
  const size = Math.ceil(sorted.length / quartileCount);

  const buckets: BarDatum[] = [];
  for (let i = 0; i < quartileCount; i++) {
    const slice = sorted.slice(i * size, (i + 1) * size);
    if (slice.length === 0) continue;
    const negative = slice.filter((r) => NEGATIVE.includes(r.satisfaction)).length;
    const times = slice.map((r) => r.time);
    const rangeLabel =
      Math.min(...times) === Math.max(...times)
        ? `${Math.min(...times)} ${minutes}`
        : `${Math.min(...times)}-${Math.max(...times)} ${minutes}`;
    buckets.push({
      label: `${quartile} ${i + 1} (${rangeLabel})`,
      value: Math.round((negative / slice.length) * 100),
    });
  }
  return buckets;
}

/**
 * Viz 11 — scatter, time vs cost, colored by satisfaction (blue/purple/red), from Q4.
 * Excludes the single highest-time and single lowest-time response (outliers
 * on the time axis specifically, since time is the axis emphasized across
 * vizzes 9/10 too) — per instructor request, "should not include the highest
 * and lowest number." If cost outliers should be excluded too/instead,
 * that needs a follow-up spec.
 */
export function viz11(table: ResponseTable, lang: Language = "he"): ScatterGroup[] {
  const l = levels(lang);
  const allRows = costTimeRows(table).filter((r) => r.time !== null && r.cost !== null) as {
    satisfaction: string;
    method: string;
    time: number;
    cost: number;
  }[];

  const times = allRows.map((r) => r.time);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const rows =
    allRows.length > 2 ? allRows.filter((r) => r.time !== minTime && r.time !== maxTime) : allRows;

  const groups: Record<"pleased" | "mixed" | "unpleased", ScatterGroup> = {
    pleased: { name: l.veryPositive, color: BLUE, points: [] },
    mixed: { name: TEXT[lang].mixed, color: PURPLE, points: [] },
    unpleased: { name: l.veryNegative, color: RED, points: [] },
  };

  for (const row of rows) {
    const point = { x: row.time, y: row.cost, method: row.method || undefined };
    if (row.satisfaction === l.veryPositive) groups.pleased.points.push(point);
    else if (row.satisfaction === l.veryNegative) groups.unpleased.points.push(point);
    else groups.mixed.points.push(point);
  }

  return [groups.pleased, groups.mixed, groups.unpleased].filter((g) => g.points.length > 0);
}

/** Strips one trailing "." (only) — keeps "?"/"!" as-is, just tidies a plain full stop for display. */
function stripTrailingPeriod(text: string): string {
  return text.endsWith(".") ? text.slice(0, -1) : text;
}

/**
 * Free-text "experience" answers occasionally contradict the satisfaction
 * rating on the same row — real respondent data, not a parsing bug (e.g. a
 * "very dissatisfied" row whose text is just "הכל טוב"). An answer that's
 * *entirely* a stock "everything's fine" phrase can't be a genuine
 * worst-experience quote no matter what satisfaction level it's tagged
 * with, so those are excluded by matching the phrase itself — deliberately
 * NOT by text length, since a short but genuinely negative quote (e.g.
 * "הכל ממש זוועה") must still be eligible. The phrase lists live in TEXT;
 * matching is case-insensitive for the English ones.
 */
function isNoComplaintPhrase(text: string, lang: Language): boolean {
  const normalized = stripTrailingPeriod(text).trim().toLowerCase();
  return TEXT[lang].noComplaintPhrases.includes(normalized);
}

/**
 * Word stems that mark a vivid, harsh complaint. Matched as substrings
 * (so Hebrew prefixes/suffixes and English inflections still hit); each
 * distinct stem found adds INTENSITY_BONUS to the answer's severity.
 */
const INTENSITY_STEMS = [
  // Hebrew
  "סיוט", "זוועה", "זוועתי", "נורא", "איום", "גיהנום", "גהנום", "עצבים", "עצבני", "תסכול",
  "מתסכל", "צפיפות", "צפוף", "דחוס", "מחנק", "חנוק", "מסוכן", "מפחיד", "פחד", "בכי", "בוכה",
  "נתקע", "תקוע", "איחור", "מאחר", "שעתיים", "חום", "מזיע", "ריח", "השפלה", "מושפל", "גרוע",
  "בלתי נסבל", "מתיש", "מותש", "לחץ",
  // English
  "nightmare", "horrible", "horrific", "terrible", "awful", "hell", "unbearable", "furious",
  "angry", "frustrat", "crowded", "packed", "suffocat", "dangerous", "scary", "scared", "afraid",
  "cry", "crying", "stuck", "late", "hours", "sweat", "smell", "humiliat", "worst", "exhaust",
  "stress",
];
const INTENSITY_BONUS = 40;

/** Higher = harsher: longer, more detailed answers plus a bonus per harsh word stem. */
function severity(text: string): number {
  const lower = text.toLowerCase();
  const hits = INTENSITY_STEMS.filter((stem) => lower.includes(stem)).length;
  return text.length + hits * INTENSITY_BONUS;
}

/**
 * Viz 12 — the 3 harshest free-text experiences from Q5. "Not satisfied
 * at all" answers always come first, falling back to "not very
 * satisfied" if fewer than 3 exist; within each level, answers are ranked
 * by severity() (most recent first on a tie). Computed locally from the
 * table, so it's instant and stable across refreshes.
 */
export function viz12(table: ResponseTable, lang: Language = "he"): string[] {
  const { veryNegative, somewhatNegative } = levels(lang);
  // Rows are in submission order; reversing makes the stable sort's
  // tie-break favor the most recent answer.
  const reversed = [...table.rows].reverse();

  function harshestWith(satisfactionValue: string): string[] {
    return reversed
      .filter((row) => (row[COL.q5.satisfaction] ?? "").trim() === satisfactionValue)
      .map((row) => stripTrailingPeriod((row[COL.q5.experience] ?? "").trim()))
      .filter((text) => text && !isNoComplaintPhrase(text, lang))
      .sort((a, b) => severity(b) - severity(a));
  }

  return [...harshestWith(veryNegative), ...harshestWith(somewhatNegative)].slice(0, 3);
}
