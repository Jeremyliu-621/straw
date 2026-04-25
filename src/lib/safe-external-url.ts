/**
 * Return a URL suitable for use in an `<a href="...">` attribute, or
 * null if the input is unsafe. Null-rendered hrefs become `<a href>`
 * which browsers treat as a same-page anchor — no navigation, no
 * script execution.
 *
 * React does NOT block `javascript:`, `data:`, or `vbscript:` URLs in
 * href attributes. Any user-controlled field rendered as an href needs
 * scheme gatekeeping. This helper is the defence-in-depth layer under
 * Zod write-time validation.
 *
 * Accepts: `http:` and `https:` URLs only. Trims leading/trailing
 * whitespace (browsers do too; attackers sometimes prefix/suffix
 * whitespace to evade naive startsWith checks).
 */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;

  // Reject URLs with embedded credentials (`https://user:pass@host`).
  // Those render fine but are commonly used to mislead the victim about
  // the real destination. Not an XSS vector per se, but harmful UX.
  if (url.username || url.password) return null;

  return url.toString();
}

/**
 * Convenience: only allow URLs whose hostname matches one of the
 * allowed domains (or a subdomain thereof). Use for fields that should
 * point at a specific vendor — e.g. `github_url` → github.com only.
 */
export function safeUrlOnHosts(
  raw: string | null | undefined,
  allowedHosts: string[]
): string | null {
  const safe = safeExternalUrl(raw);
  if (!safe) return null;

  const host = new URL(safe).hostname.toLowerCase();
  const allowed = allowedHosts.map((h) => h.toLowerCase());
  for (const h of allowed) {
    if (host === h || host.endsWith(`.${h}`)) return safe;
  }
  return null;
}
