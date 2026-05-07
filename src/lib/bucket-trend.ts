/**
 * Pure-function bucketing helpers used by `/api/dashboard/kpi-trends`.
 *
 * Kept in a standalone module so tests don't drag in Next.js / NextAuth.
 * The route file imports these and wraps them with the auth + DB layer.
 */

export interface TrendResult {
  /** Per-day values, oldest to newest, length === `days`. */
  series: number[];
  /** Period-over-period delta computed against the prior `days` window. */
  delta: { value: number; direction: "up" | "down" | "flat"; period: string };
}

/**
 * Count occurrences per UTC day. Output series has `days` entries (oldest → newest).
 */
export function bucketCount(timestamps: string[], days: number, now: Date = new Date()): TrendResult {
  return bucketReduce(
    timestamps.map((ts) => ({ ts, value: 1 })),
    days,
    now,
    "sum"
  );
}

/**
 * Sum values per UTC day.
 */
export function bucketSum(
  rows: Array<{ ts: string; value: number }>,
  days: number,
  now: Date = new Date()
): TrendResult {
  return bucketReduce(rows, days, now, "sum");
}

/**
 * Average values per UTC day. Days with no data render as 0 in the series
 * but are excluded from the period-over-period delta calculation so an
 * empty-vs-empty comparison doesn't lie.
 */
export function bucketAverage(
  rows: Array<{ ts: string; value: number }>,
  days: number,
  now: Date = new Date()
): TrendResult {
  return bucketReduce(rows, days, now, "avg");
}

function bucketReduce(
  rows: Array<{ ts: string; value: number }>,
  days: number,
  now: Date,
  mode: "sum" | "avg"
): TrendResult {
  const totalDays = days * 2;
  const buckets: { sum: number; count: number }[] = Array.from(
    { length: totalDays },
    () => ({ sum: 0, count: 0 })
  );

  // Today's UTC midnight. Bucket index 2*days-1 = today; 0 = oldest in window.
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const dayMs = 24 * 60 * 60 * 1000;

  for (const row of rows) {
    const t = new Date(row.ts);
    if (Number.isNaN(t.getTime())) continue;
    const tUtc = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
    const diffDays = Math.floor((todayUtc.getTime() - tUtc) / dayMs);
    const idx = totalDays - 1 - diffDays;
    if (idx < 0 || idx >= totalDays) continue;
    buckets[idx].sum += row.value;
    buckets[idx].count += 1;
  }

  const valueOf = (b: { sum: number; count: number }) =>
    mode === "avg" ? (b.count > 0 ? b.sum / b.count : 0) : b.sum;

  const allValues = buckets.map(valueOf);
  const series = allValues.slice(days);

  // Delta: aggregate the way the metric reduces.
  let currentAgg: number;
  let priorAgg: number;
  if (mode === "avg") {
    const cur = buckets.slice(days).filter((b) => b.count > 0);
    const prev = buckets.slice(0, days).filter((b) => b.count > 0);
    currentAgg =
      cur.length > 0
        ? cur.reduce((a, b) => a + b.sum, 0) / cur.reduce((a, b) => a + b.count, 0)
        : 0;
    priorAgg =
      prev.length > 0
        ? prev.reduce((a, b) => a + b.sum, 0) / prev.reduce((a, b) => a + b.count, 0)
        : 0;
  } else {
    currentAgg = series.reduce((a, b) => a + b, 0);
    priorAgg = allValues.slice(0, days).reduce((a, b) => a + b, 0);
  }

  let direction: "up" | "down" | "flat" = "flat";
  let value = 0;
  if (priorAgg === 0 && currentAgg === 0) {
    direction = "flat";
    value = 0;
  } else if (priorAgg === 0) {
    direction = "up";
    value = 100;
  } else {
    const pct = ((currentAgg - priorAgg) / priorAgg) * 100;
    value = Math.abs(pct);
    direction = pct > 0.1 ? "up" : pct < -0.1 ? "down" : "flat";
  }

  return {
    series,
    delta: { value, direction, period: `vs prior ${days}d` },
  };
}
