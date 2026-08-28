/**
 * Normalizes whatever "publish to web" link a user pastes into a
 * fetchable CSV URL. Google's publish flow sometimes hands out a
 * `/pubhtml` link (an HTML preview page, not fetchable as data) even
 * when the intent was CSV — this coerces it to `/pub?output=csv...`,
 * which is what actually returns CSV with the CORS headers a browser
 * fetch needs. Anything else is passed through unchanged.
 */
export function toCsvUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (trimmed.includes("/pubhtml")) {
    const [base, query] = trimmed.split("?");
    const csvBase = base.replace("/pubhtml", "/pub");
    const params = new URLSearchParams(query ?? "");
    params.delete("single");
    params.set("output", "csv");
    return `${csvBase}?${params.toString()}`;
  }

  if (trimmed.includes("/pub") && !trimmed.includes("output=csv")) {
    const separator = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${separator}output=csv`;
  }

  return trimmed;
}
