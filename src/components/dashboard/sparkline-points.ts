/**
 * Pure helpers for rendering inline-SVG sparklines without a charting library.
 *
 * Kept separate from the React component so the math is unit-testable without
 * jsdom. The component imports these and feeds the result into a <polyline>
 * and <path> (for the faint area fill below the line).
 */

export interface SparklineGeometry {
  /** Points string for `<polyline points="..." />` — N comma-separated x,y pairs. */
  points: string;
  /** SVG path d="..." for the faint area fill below the line (closed at baseline). */
  areaPath: string;
  /** Whether the data is monotonically non-decreasing — used by the component to colour up-trending green. */
  trendDirection: "up" | "down" | "flat";
  /** True when at least 2 data points were available; the component hides the sparkline if false. */
  hasShape: boolean;
}

export interface SparklineOptions {
  /** SVG viewport width. */
  width: number;
  /** SVG viewport height. */
  height: number;
  /** Padding inside the viewport so line strokes don't get clipped at the edges. Default 1. */
  padding?: number;
  /**
   * If the dataset is shorter than this, render only what's there.
   * If longer, take the most recent N points.
   * Default 14 — matches the dashboard direction doc spec.
   */
  maxPoints?: number;
}

/**
 * Compute the geometry for a sparkline given a numeric series and viewport
 * dimensions. Pure, deterministic, no DOM.
 *
 * Behaviour notes:
 * - Empty or single-point series: returns hasShape=false; component should
 *   render a placeholder, not a degenerate line.
 * - All-equal series: renders a flat horizontal line in the middle of the
 *   viewport — that's "no change," which is meaningful information.
 * - Negative values: respected. The y axis is auto-fit to [min, max] of the
 *   provided window.
 * - The areaPath closes the polyline back to the bottom-left/bottom-right
 *   corners, producing a fillable shape under the line.
 */
export function computeSparkline(
  data: number[],
  options: SparklineOptions
): SparklineGeometry {
  const { width, height, padding = 1, maxPoints = 14 } = options;

  if (!Array.isArray(data) || data.length < 2) {
    return { points: "", areaPath: "", trendDirection: "flat", hasShape: false };
  }

  // Take the most recent maxPoints — sparklines are about recency.
  const series = data.length > maxPoints ? data.slice(data.length - maxPoints) : data;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min;

  const innerWidth = Math.max(0, width - padding * 2);
  const innerHeight = Math.max(0, height - padding * 2);

  const stepX = series.length === 1 ? 0 : innerWidth / (series.length - 1);

  // SVG y is inverted (0 is top), so a higher value means a smaller y.
  // When range is 0 (all-equal), render flat at the middle of the inner area.
  const yFor = (value: number): number => {
    if (range === 0) return padding + innerHeight / 2;
    const norm = (value - min) / range;
    return padding + innerHeight - norm * innerHeight;
  };

  const xy: Array<[number, number]> = series.map((value, i) => [
    padding + i * stepX,
    yFor(value),
  ]);

  const points = xy
    .map(([x, y]) => `${roundTo(x, 2)},${roundTo(y, 2)}`)
    .join(" ");

  // Area path: M start.x,baseline L points L end.x,baseline Z
  const baseline = padding + innerHeight;
  const startX = xy[0]?.[0] ?? padding;
  const endX = xy[xy.length - 1]?.[0] ?? padding + innerWidth;

  const lineSegment = xy
    .map(([x, y], i) => (i === 0 ? `M ${roundTo(x, 2)} ${roundTo(y, 2)}` : `L ${roundTo(x, 2)} ${roundTo(y, 2)}`))
    .join(" ");

  const areaPath = `M ${roundTo(startX, 2)} ${baseline} ${lineSegment.replace(/^M/, "L")} L ${roundTo(endX, 2)} ${baseline} Z`;

  const trendDirection: SparklineGeometry["trendDirection"] =
    range === 0 ? "flat" : series[series.length - 1] >= series[0] ? "up" : "down";

  return { points, areaPath, trendDirection, hasShape: true };
}

function roundTo(value: number, places: number): number {
  const k = Math.pow(10, places);
  return Math.round(value * k) / k;
}
