"use client";

import { useEffect, useState } from "react";

/**
 * Client-side hook for fetching a KPI trend from `/api/dashboard/kpi-trends`.
 *
 * Returns `{ series, delta, loading, error }`. The KpiTile component takes
 * the series + delta directly, so the call site is one line:
 *
 *   const { series, delta } = useKpiTrend("submissions");
 *   <KpiTile sparkline={series} delta={delta} ... />
 *
 * Behaviour notes:
 * - `loading` is true on the initial fetch only; it stays false on metric
 *   changes that re-fetch.
 * - On error, returns empty series so the tile gracefully hides the
 *   sparkline. Callers don't need to handle the error case visually.
 * - The hook respects React 19 strict-mode double-invocation by using
 *   an AbortController on the fetch.
 */

export type KpiMetric =
  | "submissions"
  | "submissions_completed"
  | "tasks_entered"
  | "score"
  | "tasks"
  | "budget"
  | "drafts"
  | "active"
  | "submissions_received";

export interface KpiTrend {
  series: number[];
  delta:
    | { value: number; direction: "up" | "down" | "flat"; period: string }
    | undefined;
  loading: boolean;
  error: string | null;
}

interface TrendResponse {
  metric: KpiMetric;
  days: number;
  series: number[];
  delta: { value: number; direction: "up" | "down" | "flat"; period: string };
}

export function useKpiTrend(metric: KpiMetric, days = 14): KpiTrend {
  const [state, setState] = useState<KpiTrend>({
    series: [],
    delta: undefined,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/dashboard/kpi-trends?metric=${metric}&days=${days}`, {
      signal: ctrl.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<TrendResponse>;
      })
      .then((data) => {
        setState({
          series: data.series,
          delta: data.delta,
          loading: false,
          error: null,
        });
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setState({ series: [], delta: undefined, loading: false, error: err.message });
      });
    return () => ctrl.abort();
  }, [metric, days]);

  return state;
}
