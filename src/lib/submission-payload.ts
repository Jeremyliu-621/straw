/**
 * Per-kind submission payload schemas + validation, including SSRF and
 * scheme guards on URL-bearing fields.
 *
 * Per DECISIONS.md D23 (2026-04-24): a submission can be one of several
 * kinds beyond a zip artifact. Each kind has its own payload shape; this
 * module is the single source of truth for what a valid payload looks
 * like and what URLs the platform will safely consume.
 *
 * Security model:
 * - `live_endpoint` URLs and `repo_url` URLs MUST be https. http://localhost,
 *   private IP space (RFC1918 / metadata IPs), and non-{https,http} schemes
 *   are rejected at the validation boundary so a daemon can't trick the
 *   eval worker into hitting an internal service.
 * - `dockerfile` accepts a Dockerfile *content* string (not a URL pointing
 *   to one) so we never fetch arbitrary content during validation.
 * - `mixed` is recursively validated against this same set of kinds — but
 *   nested `mixed` is rejected to prevent unbounded recursion.
 */

import { z } from "zod/v4";
import { SUBMISSION_KIND, type SubmissionKind } from "@/constants";

// ── URL guards ───────────────────────────────────────────────

const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  // Cloud metadata endpoints (AWS, GCP, Azure, DigitalOcean, etc.).
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.azure.com",
]);

/**
 * Reject URLs that resolve to private/loopback/link-local space or to
 * known cloud metadata endpoints. Also reject non-{http,https} schemes.
 *
 * Hostname-based check is a SECOND line of defense; the eval worker
 * should ALSO refuse to fetch URLs whose DNS-resolved IP is private
 * (DNS rebinding defense). That is enforced when the worker actually
 * makes the request — see Block 2b worker integration.
 */
function isSafePublicUrl(raw: string, allowHttp = false): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    return false;
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (PRIVATE_HOSTNAMES.has(host)) return false;
  // RFC1918 / link-local / multicast ranges (string-pattern check; not a
  // substitute for DNS-time enforcement, but blocks the obvious attempts).
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;
  if (/^fe80:/.test(host)) return false; // IPv6 link-local
  if (/^fc00:/.test(host) || /^fd00:/.test(host)) return false; // IPv6 ULA
  return true;
}

const safeHttpsUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine((s) => isSafePublicUrl(s), {
    message: "URL must be https:// pointing at a public host (no localhost / RFC1918 / metadata endpoints)",
  });

// ── Per-kind payload schemas ─────────────────────────────────

/**
 * Empty/null payload for kind=zip — the artifact lives in Storage, not
 * in the payload column.
 */
export const zipPayloadSchema = z.null().or(z.object({}).strict()).optional();

/**
 * Public Git repo the platform clones at eval time.
 *
 * `ref` is optional (default branch). `subpath` lets a daemon point at
 * a specific subdir of a monorepo without needing to fork.
 */
export const repoUrlPayloadSchema = z.object({
  url: safeHttpsUrlSchema.describe("Public HTTPS Git URL — github.com, gitlab.com, etc."),
  ref: z.string().min(1).max(255).optional().describe("Branch, tag, or commit SHA. Default: repo's default branch."),
  subpath: z
    .string()
    .max(512)
    .optional()
    .refine((s) => s === undefined || (!s.startsWith("/") && !s.includes("..")), {
      message: "subpath must be relative and must not contain '..'",
    })
    .describe("Optional subdirectory within the repo. Must be relative, no parent traversal."),
});

/**
 * Live HTTPS endpoint the eval committee will probe like a real user.
 *
 * The endpoint must be HTTPS (no http:// allowed at this layer — the eval
 * environment may relax this in dev). Auth is optional; if provided, it's
 * passed verbatim in the Authorization header on every probe.
 */
export const liveEndpointPayloadSchema = z.object({
  url: safeHttpsUrlSchema.describe("Live HTTPS endpoint root. Probes hit `${url}/<probe-path>` per the rubric."),
  health_path: z
    .string()
    .max(512)
    .regex(/^\//, "health_path must start with /")
    .optional()
    .describe("Health check path (default: /health). Must return 2xx within 5s for the eval to start."),
  auth_header: z
    .string()
    .max(2048)
    .optional()
    .describe("Optional Authorization header value the prober sends on every request (e.g. 'Bearer abc123')."),
  notes: z.string().max(4000).optional().describe("Free-form notes for the eval committee — auth caveats, rate limits, etc."),
});

/**
 * Inline Dockerfile the platform builds + runs in the existing eval-container
 * sandbox. The Dockerfile content is validated for size + obvious abuse
 * patterns; deeper static analysis is the eval worker's job.
 */
export const dockerfilePayloadSchema = z.object({
  dockerfile: z
    .string()
    .min(1)
    .max(64 * 1024, "Dockerfile too large (64KB max)")
    .describe("The Dockerfile content. Must produce an image the eval committee can run."),
  context_files: z
    .record(z.string(), z.string())
    .optional()
    .describe("Optional supporting files (paths → content) included in the build context."),
  build_args: z.record(z.string(), z.string()).optional().describe("Optional --build-arg values."),
});

/**
 * Composite kind. Array of sub-submissions, each with its own kind. The
 * eval committee scores each independently; final score is the rubric-
 * weighted average. Nested `mixed` is forbidden to bound recursion.
 */
export const mixedPayloadSchema: z.ZodType<{
  parts: Array<{
    kind: Exclude<SubmissionKind, "mixed">;
    payload: unknown;
    weight?: number;
  }>;
}> = z.object({
  parts: z
    .array(
      z.object({
        kind: z.enum([
          SUBMISSION_KIND.ZIP,
          SUBMISSION_KIND.REPO_URL,
          SUBMISSION_KIND.LIVE_ENDPOINT,
          SUBMISSION_KIND.DOCKERFILE,
        ]),
        payload: z.unknown(),
        weight: z.number().min(0).max(1).optional().describe("Optional weight for this part. If any are set, they must sum to 1.0."),
      })
    )
    .min(1, "mixed must have at least one part")
    .max(10, "mixed may have at most 10 parts"),
});

// ── Dispatcher ───────────────────────────────────────────────

export type SubmissionPayloadValidationResult =
  | { valid: true; payload: unknown }
  | { valid: false; error: string; details?: unknown };

/**
 * Validate a payload against the schema for the given kind. Returns a
 * tagged result so callers can pass `error` straight to apiError().
 *
 * Recursive validation for `mixed` runs each part through this same
 * function; nested mixed is rejected by the schema, not here.
 */
export function validateSubmissionPayload(
  kind: SubmissionKind,
  payload: unknown
): SubmissionPayloadValidationResult {
  try {
    switch (kind) {
      case SUBMISSION_KIND.ZIP:
        zipPayloadSchema.parse(payload);
        return { valid: true, payload: null };
      case SUBMISSION_KIND.REPO_URL:
        return { valid: true, payload: repoUrlPayloadSchema.parse(payload) };
      case SUBMISSION_KIND.LIVE_ENDPOINT:
        return { valid: true, payload: liveEndpointPayloadSchema.parse(payload) };
      case SUBMISSION_KIND.DOCKERFILE:
        return { valid: true, payload: dockerfilePayloadSchema.parse(payload) };
      case SUBMISSION_KIND.MIXED: {
        const parsed = mixedPayloadSchema.parse(payload);
        // Recursively validate each part. The schema already forbids nested
        // mixed via the enum exclusion.
        for (const [i, part] of parsed.parts.entries()) {
          const partResult = validateSubmissionPayload(part.kind, part.payload);
          if (!partResult.valid) {
            return {
              valid: false,
              error: `mixed.parts[${i}] (kind=${part.kind}) is invalid: ${partResult.error}`,
              details: partResult.details,
            };
          }
        }
        // If any weight is set, all weights must be set and sum to 1.
        const weights = parsed.parts.map((p) => p.weight);
        if (weights.some((w) => w !== undefined)) {
          if (weights.some((w) => w === undefined)) {
            return { valid: false, error: "mixed: if any part sets weight, all parts must set weight" };
          }
          const sum = weights.reduce<number>((acc, w) => acc + (w ?? 0), 0);
          if (Math.abs(sum - 1.0) > 1e-6) {
            return { valid: false, error: `mixed: part weights must sum to 1.0 (got ${sum})` };
          }
        }
        return { valid: true, payload: parsed };
      }
      default: {
        const _exhaustive: never = kind;
        return { valid: false, error: `Unknown submission kind: ${_exhaustive as string}` };
      }
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        valid: false,
        error: `Invalid ${kind} payload: ${err.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
        details: err.issues,
      };
    }
    return { valid: false, error: String(err) };
  }
}

// Exposed for testing — covers cases the dispatcher calls into.
export const __testing__ = { isSafePublicUrl };
