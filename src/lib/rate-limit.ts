import { NextResponse } from "next/server";
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from "@/constants";

/**
 * In-memory sliding-window rate limiter.
 *
 * Uses a Map of IP/key → request timestamps.
 * Suitable for single-process deployments. For multi-process (Vercel serverless),
 * upgrade to Redis-based rate limiting.
 *
 * Cleanup runs periodically to prevent memory leaks.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Max requests per window (default: RATE_LIMIT_MAX_REQUESTS) */
  maxRequests?: number;
  /** Window size in milliseconds (default: RATE_LIMIT_WINDOW_MS) */
  windowMs?: number;
  /** Key prefix for namespacing different limits */
  prefix?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Max requests per window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** When the current window resets (unix ms) */
  resetAt: number;
}

/**
 * Check rate limit for a given identifier (IP, user ID, API key, etc.).
 */
export function checkRateLimit(
  identifier: string,
  config?: RateLimitConfig
): RateLimitResult {
  cleanup();

  const maxRequests = config?.maxRequests ?? RATE_LIMIT_MAX_REQUESTS;
  const windowMs = config?.windowMs ?? RATE_LIMIT_WINDOW_MS;
  const prefix = config?.prefix ?? "global";
  const key = `${prefix}:${identifier}`;

  const now = Date.now();
  const cutoff = now - windowMs;

  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  const remaining = Math.max(0, maxRequests - entry.timestamps.length);
  const resetAt = entry.timestamps.length > 0
    ? entry.timestamps[0] + windowMs
    : now + windowMs;

  if (entry.timestamps.length >= maxRequests) {
    store.set(key, entry);
    return { allowed: false, limit: maxRequests, remaining: 0, resetAt };
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  return { allowed: true, limit: maxRequests, remaining: remaining - 1, resetAt };
}

/**
 * Extract client IP from request headers.
 * Tries x-forwarded-for (reverse proxy), x-real-ip, then falls back to "unknown".
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Add rate limit headers to a response.
 */
export function withRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  return response;
}

/**
 * Rate limit middleware helper.
 * Returns a 429 response if the limit is exceeded, null otherwise.
 */
export function rateLimitResponse(
  req: Request,
  config?: RateLimitConfig
): NextResponse | null {
  const ip = getClientIp(req);
  const result = checkRateLimit(ip, config);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    const response = NextResponse.json(
      {
        error: {
          message: "Too many requests. Please try again later.",
          code: "RATE_LIMITED",
          retry_after_seconds: retryAfter,
        },
      },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(retryAfter));
    return withRateLimitHeaders(response, result);
  }

  return null;
}
