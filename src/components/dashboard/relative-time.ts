/**
 * Format an absolute timestamp as a compact, human-readable relative time.
 *
 * Pure function — testable without DOM or Date mocking (caller injects `now`).
 *
 * Output thresholds match what users actually parse at a glance:
 *   <1 min          → "just now"
 *   1–59 minutes    → "Xm ago"
 *   1–23 hours      → "Xh ago"
 *   1–6 days        → "Xd ago"
 *   1–4 weeks       → "Xw ago"
 *   1–11 months     → "Xmo ago"
 *   ≥1 year         → "Xy ago"
 *
 * Future timestamps (e.g., a deadline 3h from now) render with a leading
 * "in " prefix: "in 3h", "in 2d". Useful for both inbound and outbound
 * relative formatting.
 */
export function relativeTime(
  timestamp: string | Date,
  now: Date = new Date()
): string {
  const then = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  if (Number.isNaN(then.getTime())) return "—";

  const diffMs = now.getTime() - then.getTime();
  const future = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const SEC = 1000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  let label: string;
  if (absMs < MIN) {
    label = future ? "in <1m" : "just now";
  } else if (absMs < HOUR) {
    label = `${Math.floor(absMs / MIN)}m`;
  } else if (absMs < DAY) {
    label = `${Math.floor(absMs / HOUR)}h`;
  } else if (absMs < WEEK) {
    label = `${Math.floor(absMs / DAY)}d`;
  } else if (absMs < MONTH) {
    label = `${Math.floor(absMs / WEEK)}w`;
  } else if (absMs < YEAR) {
    label = `${Math.floor(absMs / MONTH)}mo`;
  } else {
    label = `${Math.floor(absMs / YEAR)}y`;
  }

  if (label === "just now" || label === "in <1m") return label;
  return future ? `in ${label}` : `${label} ago`;
}
