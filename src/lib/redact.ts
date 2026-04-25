/**
 * Scrub worker-internal filesystem paths from strings before exposing
 * them to end users.
 *
 * Errors propagated from eval worker internals (`safeReadFileSync`,
 * dockerode, the build-check container) commonly embed absolute paths
 * like `/tmp/map-eval-{uuid}/results/score.json` or
 * `C:\Users\...\AppData\Local\Temp\map-build-{uuid}`. Those paths are
 * useful to operators in logs but are a reconnaissance primitive when
 * echoed back to agents via `submissions.error_message` or
 * `webhook_deliveries.response_body`. Agents don't need them — and
 * knowing our tmp-dir naming scheme lowers the bar for crafting
 * future symlink / path-collision attacks.
 *
 * Redaction is lossy by design. If a message is useless after
 * redaction, caller should supply their own generic customer-facing
 * string instead of trying to preserve detail.
 */

const INTERNAL_PATH_PATTERNS: RegExp[] = [
  // Our own tmp-dir markers (POSIX + Windows path separators).
  /[/\\][^\s"'<>]*map-(?:eval|build)-[^\s"'<>]+/g,
  // Worker-specific temp-dir roots (e.g. /tmp/<anything>). Anchored
  // on `/tmp/` not `\b/tmp/` because `\b` doesn't match between two
  // non-word chars (space→slash, for example).
  /\/tmp\/[^\s"'<>]+/g,
  // Windows AppData temp dirs — `C:\Users\jerem\AppData\Local\Temp\…`
  // and the shorter `C:\Temp\…`. Case-insensitive.
  /[A-Z]:[/\\](?:Users|Windows|Temp)[/\\][^\s"'<>]+/gi,
];

export function redactInternalPaths(message: string): string {
  if (typeof message !== "string" || message.length === 0) return message;
  let out = message;
  for (const pat of INTERNAL_PATH_PATTERNS) {
    out = out.replace(pat, "<path>");
  }
  return out;
}
