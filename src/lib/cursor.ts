/**
 * Opaque cursor encoding for paginated APIs.
 *
 * Pagination cursors used to be raw ISO timestamps written straight into
 * `next_cursor`. Iter 6 customer dogfood found that round-tripping such a
 * cursor through a URL query string mangled the embedded `+` (timezone
 * offset) into a space; the next request 500'd because the server then
 * tried to parse "...:33.259 00:00" as a timestamp.
 *
 * The doc already calls cursors "opaque" — clients are expected to copy
 * them verbatim and not parse. So encoding them in base64url eliminates
 * the URL-reserved-character footgun without changing the contract.
 *
 * `decodeCursor` is lenient: if the input doesn't look like base64url
 * (e.g. an old raw-ISO cursor a daemon persisted before this change),
 * we fall back to treating it as the raw value. That keeps in-flight
 * paginations working across the deploy boundary.
 */

const BASE64URL_RE = /^[A-Za-z0-9_-]+={0,2}$/;

export function encodeCursor(raw: string): string {
  return Buffer.from(raw, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeCursor(input: string): string {
  // Heuristic — a base64url cursor will only contain [A-Za-z0-9_-=].
  // If the input has anything else (`:`, `T`, `+`, `.`), treat it as a
  // legacy raw value and pass through unchanged.
  if (!BASE64URL_RE.test(input)) return input;
  // Pad to a multiple of 4 before atob.
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const fullPad = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  try {
    const decoded = Buffer.from(fullPad, "base64").toString("utf8");
    // Sanity — if it doesn't decode to printable text or is empty, the
    // input wasn't really our format. Pass through.
    if (decoded.length === 0) return input;
    return decoded;
  } catch {
    return input;
  }
}
