import { timingSafeEqual } from "node:crypto";

/**
 * Verify a request came from a trusted cron source.
 *
 * Accepts either:
 *  - `Authorization: Bearer <CRON_SECRET>` header
 *  - `x-vercel-cron-signature: <CRON_SECRET>` header (Vercel Cron)
 *  - Dev mode (when NODE_ENV === "development")
 *
 * Comparison uses `crypto.timingSafeEqual` to avoid leaking the secret
 * via response-time side channels. Returns `true` if the request is
 * authorized, `false` otherwise.
 */
export function verifyCronRequest(req: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = req.headers.get("authorization");
  const vercelCron = req.headers.get("x-vercel-cron-signature");

  if (vercelCron && constantTimeEquals(vercelCron, cronSecret)) return true;

  if (authHeader) {
    const expectedBearer = `Bearer ${cronSecret}`;
    if (constantTimeEquals(authHeader, expectedBearer)) return true;
  }

  return false;
}

/**
 * Compare two strings in constant time. Returns `false` on length
 * mismatch (timingSafeEqual requires equal length) — that's fine for
 * our use case because a length mismatch already means the secret is
 * wrong; the timing distinction between "wrong length" and "wrong
 * content" leaks only the length, which is not sensitive here.
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  try {
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}
