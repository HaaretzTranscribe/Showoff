import { parseLenientNumber, type ResponseTable } from "@/lib/responses";
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

const POSITIVE = ["מרוצה מאוד", "מרוצה חלקית"];
const NEGATIVE = ["לא כל כך מרוצה", "לא מרוצה כלל"];
const VERY_POSITIVE = "מרוצה מאוד";
const VERY_NEGATIVE = "לא מרוצה כלל";

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

/** Converts counts to % of the total (rounded), rather than nominal counts — vizzes 1-5 are all normalized so bars are comparable regardless of how many students have responded so far. */
function toPercentBarData(counts: Map<string, number>, order?: string[]): BarDatum[] {
  const total = Array.from(counts.values()).reduce((sum, v) => sum + v, 0);
  const labels = order ?? Array.from(counts.keys());
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
export function viz1(table: ResponseTable): BarDatum[] {
  return toPercentBarData(countBy(table.rows, COL.q1.satisfaction));
}

/** Viz 2 — bar chart, Q2's 4-point satisfaction scale as % of respondents. */
export function viz2(table: ResponseTable): BarDatum[] {
  return toPercentBarData(countBy(table.rows, COL.q2.satisfaction), [...POSITIVE, ...NEGATIVE]);
}

/** Viz 3 — same Q2 data, collapsed to positive vs negative, as % of respondents. */
export function viz3(table: ResponseTable): BarDatum[] {
  const counts = countBy(table.rows, COL.q2.satisfaction);
  const positive = POSITIVE.reduce((sum, k) => sum + (counts.get(k) ?? 0), 0);
  const negative = NEGATIVE.reduce((sum, k) => sum + (counts.get(k) ?? 0), 0);
  const total = positive + negative;
  return [
    { label: "חיובי", value: total > 0 ? Math.round((positive / total) * 100) : 0, color: BLUE },
    { label: "שלילי", value: total > 0 ? Math.round((negative / total) * 100) : 0, color: RED },
  ];
}

/** Viz 4 — bar chart, Q3's transportation method as % of respondents. */
export function viz4(table: ResponseTable): BarDatum[] {
  return toPercentBarData(countBy(table.rows, COL.q3.method));
}

/** Viz 5 — % dissatisfied per transportation method, from Q3. */
export function viz5(table: ResponseTable): BarDatum[] {
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

/** Viz 6 — big number, average monthly cost from Q4. */
export function viz6(table: ResponseTable): number {
  const costs = costTimeRows(table)
    .map((r) => r.cost)
    .filter((c): c is number => c !== null);
  return mean(costs);
}

/** Viz 7 — big number, median monthly cost from Q4. */
export function viz7(table: ResponseTable): number {
  const costs = costTimeRows(table)
    .map((r) => r.cost)
    .filter((c): c is number => c !== null);
  return median(costs);
}

/** Viz 8 — big number, median commute time from Q4. */
export function viz8(table: ResponseTable): number {
  const times = costTimeRows(table)
    .map((r) => r.time)
    .filter((t): t is number => t !== null);
  return median(times);
}

/** Viz 9 — % dissatisfied per quartile of commute time, from Q4. */
export function viz9(table: ResponseTable): BarDatum[] {
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
        ? `${Math.min(...times)} דקות`
        : `${Math.min(...times)}-${Math.max(...times)} דקות`;
    buckets.push({
      label: `רבעון ${i + 1} (${rangeLabel})`,
      value: Math.round((negative / slice.length) * 100),
    });
  }
  return buckets;
}

/**
 * Viz 10 — scatter, time vs cost, colored by satisfaction (blue/purple/red), from Q4.
 * Excludes the single highest-time and single lowest-time response (outliers
 * on the time axis specifically, since time is the axis emphasized across
 * vizzes 8/9 too) — per instructor request, "should not include the highest
 * and lowest number." If cost outliers should be excluded too/instead,
 * that needs a follow-up spec.
 */
export function viz10(table: ResponseTable): ScatterGroup[] {
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
    pleased: { name: "מרוצה מאוד", color: BLUE, points: [] },
    mixed: { name: "מרוצה חלקית / לא כל כך מרוצה", color: PURPLE, points: [] },
    unpleased: { name: "לא מרוצה כלל", color: RED, points: [] },
  };

  for (const row of rows) {
    const point = { x: row.time, y: row.cost, method: row.method || undefined };
    if (row.satisfaction === VERY_POSITIVE) groups.pleased.points.push(point);
    else if (row.satisfaction === VERY_NEGATIVE) groups.unpleased.points.push(point);
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
 * "הכל ממש זוועה") must still be eligible.
 */
const NO_COMPLAINT_PHRASES = new Set([
  "הכל טוב",
  "הכל בסדר",
  "הכל בסדר גמור",
  "בסדר גמור",
  "הכל כיף",
  "הכל מצוין",
  "הכל אחלה",
  "הכל נהדר",
  "אין תלונות",
]);

function isNoComplaintPhrase(text: string): boolean {
  return NO_COMPLAINT_PHRASES.has(stripTrailingPeriod(text).trim());
}

/** Viz 11 — the 3 most recent "very dissatisfied" free-text experiences from Q5. */
export function viz11(table: ResponseTable): string[] {
  // Rows are in submission order; take from the end (most recent) first.
  const reversed = [...table.rows].reverse();

  function textsWith(satisfactionValue: string, excluding: Set<number>): string[] {
    const out: string[] = [];
    reversed.forEach((row, i) => {
      if (excluding.has(i)) return;
      const satisfaction = (row[COL.q5.satisfaction] ?? "").trim();
      const experience = (row[COL.q5.experience] ?? "").trim();
      if (satisfaction === satisfactionValue && experience && !isNoComplaintPhrase(experience)) {
        out.push(stripTrailingPeriod(experience));
      }
    });
    return out;
  }

  const worst = textsWith(VERY_NEGATIVE, new Set());
  if (worst.length >= 3) return worst.slice(0, 3);

  const usedIndices = new Set(
    reversed.reduce<number[]>((acc, row, i) => {
      if ((row[COL.q5.satisfaction] ?? "").trim() === VERY_NEGATIVE) acc.push(i);
      return acc;
    }, [])
  );
  const nextWorst = textsWith("לא כל כך מרוצה", usedIndices);

  return [...worst, ...nextWorst].slice(0, 3);
}
