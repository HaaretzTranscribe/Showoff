// Mirrors src/domain/identifier.ts. Deno Edge Functions resolve modules
// by URL and cannot import from the Vite src/ tree, so this normalization
// logic is intentionally duplicated. Keep both copies in sync.

export function normalizeIdentifier(raw: string): string {
  const stripped = raw.trim().replace(/[\s.\-]/g, "");
  if (/^\d+$/.test(stripped)) {
    return stripped.padStart(9, "0");
  }
  return stripped.toUpperCase();
}

/** HMAC-SHA256(normalized identifier, server secret), hex-encoded (spec section 13.2). */
export async function hashIdentifier(normalized: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
