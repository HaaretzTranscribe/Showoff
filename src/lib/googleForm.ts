/** Accepts either a plain Google Forms share link or one that already has ?embedded=true. */
export function toEmbedUrl(formUrl: string): string {
  try {
    const url = new URL(formUrl);
    url.searchParams.set("embedded", "true");
    return url.toString();
  } catch {
    return formUrl;
  }
}
