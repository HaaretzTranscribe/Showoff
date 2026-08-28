import { parseCsv } from "./csv";
import { toCsvUrl } from "./googleSheetUrl";

/**
 * Raw Google Forms response data, kept positional (headers as literal
 * question text, rows as string arrays) rather than run through
 * parseCsvRecords' header normalization — that normalizer strips
 * non-ASCII characters, which would collapse every Hebrew question
 * column to the same empty key. Visualizations index into `rows` by
 * column position instead (column 0 is always Timestamp).
 */
export interface ResponseTable {
  headers: string[];
  rows: string[][];
}

export async function fetchResponses(csvUrl: string): Promise<ResponseTable | null> {
  try {
    const response = await fetch(toCsvUrl(csvUrl), { cache: "no-store" });
    if (!response.ok) return null;
    const text = await response.text();
    const allRows = parseCsv(text).filter((r) => r.some((cell) => cell.trim() !== ""));
    if (allRows.length === 0) return { headers: [], rows: [] };
    const [headers, ...rows] = allRows;
    return { headers, rows };
  } catch {
    return null;
  }
}

/** Parses a leniently-typed number out of free text (e.g. "500 ש"ח", "כ-30 דקות") — returns null if nothing numeric is found. */
export function parseLenientNumber(raw: string): number | null {
  const match = raw.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}
