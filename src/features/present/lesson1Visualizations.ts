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

function toBarData(counts: Map<string, number>, order?: string[]): BarDatum[] {
  const labels = order ?? Array.from(counts.keys());
  return labels.map((label) => ({ label, value: counts.get(label) ?? 0 }));
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

/** Viz 1 — bar chart, Q1's Yes/No counts. */
export function viz1(table: ResponseTable): BarDatum[] {
  return toBarData(countBy(table.rows, COL.q1.satisfaction));
}

/** Viz 2 — bar chart, Q2's 4-point satisfaction scale, raw. */
export function viz2(table: ResponseTable): BarDatum[] {
  return toBarData(countBy(table.rows, COL.q2.satisfaction), [...POSITIVE, ...NEGATIVE]);
}

/** Viz 3 — same Q2 data, collapsed to positive vs negative. */
export function viz3(table: ResponseTable): BarDatum[] {
  const counts = countBy(table.rows, COL.q2.satisfaction);
  const positive = POSITIVE.reduce((sum, k) => sum + (counts.get(k) ?? 0), 0);
  const negative = NEGATIVE.reduce((sum, k) => sum + (counts.get(k) ?? 0), 0);
  return [
    { label: "חיובי", value: positive, color: BLUE },
    { label: "שלילי", value: negative, color: RED },
  ];
}

/** Viz 4 — bar chart, Q3's transportation method counts. */
export function viz4(table: ResponseTable): BarDatum[] {
  return toBarData(countBy(table.rows, COL.q3.method));
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

function costTimeRows(table: ResponseTable): { satisfaction: string; cost: number | null; time: number | null }[] {
  return table.rows.map((row) => ({
    satisfaction: (row[COL.q4.satisfaction] ?? "").trim(),
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
  const labels = ["רבעון 1 (הכי מהיר)", "רבעון 2", "רבעון 3", "רבעון 4 (הכי איטי)"];

  const buckets: BarDatum[] = [];
  for (let i = 0; i < quartileCount; i++) {
    const slice = sorted.slice(i * size, (i + 1) * size);
    if (slice.length === 0) continue;
    const negative = slice.filter((r) => NEGATIVE.includes(r.satisfaction)).length;
    buckets.push({ label: labels[i], value: Math.round((negative / slice.length) * 100) });
  }
  return buckets;
}

/** Viz 10 — scatter, time vs cost, colored by satisfaction (blue/purple/red), from Q4. */
export function viz10(table: ResponseTable): ScatterGroup[] {
  const rows = costTimeRows(table).filter((r) => r.time !== null && r.cost !== null) as {
    satisfaction: string;
    time: number;
    cost: number;
  }[];

  const groups: Record<"pleased" | "mixed" | "unpleased", ScatterGroup> = {
    pleased: { name: "מרוצה מאוד", color: BLUE, points: [] },
    mixed: { name: "מרוצה חלקית / לא כל כך מרוצה", color: PURPLE, points: [] },
    unpleased: { name: "לא מרוצה כלל", color: RED, points: [] },
  };

  for (const row of rows) {
    const point = { x: row.time, y: row.cost };
    if (row.satisfaction === VERY_POSITIVE) groups.pleased.points.push(point);
    else if (row.satisfaction === VERY_NEGATIVE) groups.unpleased.points.push(point);
    else groups.mixed.points.push(point);
  }

  return [groups.pleased, groups.mixed, groups.unpleased].filter((g) => g.points.length > 0);
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
      if (satisfaction === satisfactionValue && experience) out.push(experience);
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
