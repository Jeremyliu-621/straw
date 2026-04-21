/**
 * Validation for URLs that the platform will POST to on behalf of users
 * (webhook delivery). The goal is to block SSRF to internal networks,
 * cloud metadata endpoints, and loopback.
 *
 * Two checks:
 *   - `validatePublicUrlSync`: static check at registration time. Rejects
 *     obviously bad URLs (IP literals in private ranges, localhost,
 *     *.local etc). Runs inside Zod refinement.
 *   - `validatePublicUrlDynamic`: DNS-resolving check at delivery time.
 *     Catches hostnames that resolve to private IPs (including late
 *     flips after registration — DNS rebinding mitigation).
 *
 * This is defence in depth with `redirect: "manual"` already set on the
 * webhook fetch. An attacker who wants to reach metadata must now
 * (a) find a hostname that publicly resolves to a private IP, and
 * (b) win the TOCTOU race between our DNS check and the fetch. The
 * native fetch's undici resolver does its own lookup; we accept that
 * residual gap for v1 rather than hand-rolling a custom dispatcher.
 */

import dns from "node:dns/promises";
import net from "node:net";

export type UrlCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local", // mDNS — Bonjour / Avahi
  ".internal", // GCP and common convention
  ".intranet",
  ".corp",
  ".home",
  ".lan",
];

const BLOCKED_HOSTNAME_EXACT = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
]);

/**
 * Return true if the given string is a literal IP (v4 or v6) that lives
 * in a range we refuse to contact. Handles IPv4-mapped IPv6 (::ffff:x.y.z.w).
 */
export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedIpv4(ip);
  if (net.isIPv6(ip)) return isBlockedIpv6(ip);
  return false;
}

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // malformed → treat as blocked
  }
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0) return true; // IETF / TEST-NET-1 (192.0.0.0/24 + 192.0.2.0/24)
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
  if (a === 198 && b === 51) return true; // TEST-NET-2 (198.51.100.0/24)
  if (a === 203 && b === 0) return true; // TEST-NET-3 (203.0.113.0/24)
  if (a >= 224 && a <= 239) return true; // multicast
  if (a >= 240) return true; // reserved + limited broadcast
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // IPv4-mapped (::ffff:1.2.3.4 or ::ffff:0102:0304). If the embedded v4
  // is blocked, the whole address is blocked.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped) return isBlockedIpv4(mapped[1]);

  if (lower === "::" || lower === "::1") return true; // any, loopback
  if (lower.startsWith("fe80:") || lower.startsWith("fe90:") || lower.startsWith("fea0:") || lower.startsWith("feb0:")) {
    return true; // link-local fe80::/10
  }
  // Unique local fc00::/7 → first byte is fc or fd
  if (/^fc|^fd/.test(lower)) return true;
  if (lower.startsWith("ff")) return true; // multicast
  if (lower.startsWith("2001:db8:")) return true; // docs
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAME_EXACT.has(lower)) return true;
  return BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

/**
 * Static check suitable for Zod refinement. Does NOT resolve DNS.
 *
 * Accepts https://public-host/... and rejects anything pointing at an
 * obviously-internal name or IP literal.
 */
export function validatePublicUrlSync(raw: string): UrlCheckResult {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "Not a valid URL" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "URL must use https://" };
  }

  const host = normalizeHost(url.hostname);
  if (!host) return { ok: false, reason: "URL must include a host" };

  if (net.isIP(host)) {
    return isBlockedIp(host)
      ? { ok: false, reason: "URL points to a private or reserved IP range" }
      : { ok: true };
  }

  if (isBlockedHostname(host)) {
    return { ok: false, reason: "URL hostname is not routable on the public internet" };
  }

  return { ok: true };
}

/**
 * Strip the square brackets Node's URL leaves on IPv6 hostnames
 * (`new URL("https://[::1]/").hostname === "[::1]"`). Returns the raw
 * hostname so `net.isIP` can parse it.
 */
function normalizeHost(hostname: string): string {
  if (hostname.length >= 2 && hostname[0] === "[" && hostname[hostname.length - 1] === "]") {
    return hostname.slice(1, -1);
  }
  return hostname;
}

/** Minimum surface of `dns/promises` we rely on — injectable for tests. */
export type DnsLookupFn = (
  hostname: string,
  options: { all: true }
) => Promise<Array<{ address: string; family: number }>>;

const defaultLookup: DnsLookupFn = (hostname, options) =>
  dns.lookup(hostname, options);

/**
 * DNS-resolving check for use at delivery time. Returns `{ ok: false }`
 * if any resolved A/AAAA address is in a blocked range.
 *
 * `lookup` is injectable so tests can avoid the system resolver; in
 * production we default to `node:dns/promises.lookup`.
 */
export async function validatePublicUrlDynamic(
  raw: string,
  lookup: DnsLookupFn = defaultLookup
): Promise<UrlCheckResult> {
  const staticResult = validatePublicUrlSync(raw);
  if (!staticResult.ok) return staticResult;

  const url = new URL(raw);
  const host = normalizeHost(url.hostname);

  // Literal IP already covered by the sync check.
  if (net.isIP(host)) return { ok: true };

  let addrs: Array<{ address: string; family: number }>;
  try {
    addrs = await lookup(host, { all: true });
  } catch (err) {
    return { ok: false, reason: `DNS lookup failed: ${(err as Error).message}` };
  }

  if (addrs.length === 0) {
    return { ok: false, reason: "DNS returned no addresses" };
  }

  for (const a of addrs) {
    if (isBlockedIp(a.address)) {
      return {
        ok: false,
        reason: `Hostname ${host} resolved to blocked address ${a.address}`,
      };
    }
  }

  return { ok: true };
}
