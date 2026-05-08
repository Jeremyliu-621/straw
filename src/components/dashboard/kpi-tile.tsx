"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { computeSparkline } from "./sparkline-points";

export interface KpiTileProps {
  /** Tile label, ALL-CAPS small treatment per the dashboard direction. */
  label: string;
  /** Primary metric value. Stringified externally (e.g., `${count}` or `$${amount.toLocaleString()}`). */
  value: string | number;
  /**
   * Optional unit chip (e.g., "$", " submissions", "%"). Rendered after the
   * value in muted text. Use sparingly — most metrics speak for themselves.
   */
  unit?: string;
  /**
   * Sparkline series (most recent on the right). 14 points by default — see
   * sparkline-points.ts for windowing rules.
   */
  sparkline?: number[];
  /**
   * Optional period-over-period delta. The component decides green/red based
   * on `direction` × `isGoodWhenHigher`.
   */
  delta?: {
    /** Percentage change as a number (e.g., 12.3 = +12.3%). */
    value: number;
    direction: "up" | "down" | "flat";
    /** Period label, e.g., "vs last 14d". */
    period: string;
  };
  /**
   * For metrics where "up" is the desired direction (submissions count,
   * average score), set true. For metrics where "up" is bad (failed evals,
   * abandonment), set false. Drives delta colouring.
   * Default true.
   */
  isGoodWhenHigher?: boolean;
  /** Render the value in Geist Mono — useful for $ amounts, scores. Default false. */
  mono?: boolean;
  /** Make the whole tile a link. */
  href?: string;
  /** Compact mode (smaller, no sparkline, no delta). For tertiary tiles. Default false. */
  compact?: boolean;
}

/**
 * KpiTile — Stripe-style metric tile with optional sparkline and PoP delta.
 *
 * Visual contract:
 * - Label: 11px ALL-CAPS, tracked, muted.
 * - Value: 28px bold, mono optional.
 * - Sparkline: 120px × 32px inline-SVG, no library. Faint area fill under the
 *   line. Only renders if data has ≥2 points.
 * - Delta: small chip, colored by (direction × isGoodWhenHigher).
 *
 * No external dependencies beyond lucide-react (already in the repo) and
 * next/link.
 */
export function KpiTile({
  label,
  value,
  unit,
  sparkline,
  delta,
  isGoodWhenHigher = true,
  mono = false,
  href,
  compact = false,
}: KpiTileProps) {
  const sparklineGeo = sparkline
    ? // Generous padding keeps the data range comfortably inside the SVG
      // so the chart doesn't visually crash into the tile's bottom border.
      // viewBox 40 tall × padding 8 = 24px-tall data band with 8px clearance
      // top + bottom — the lowest point sits ~16px above the tile edge once
      // tile padding is added.
      computeSparkline(sparkline, { width: 120, height: 40, padding: 8 })
    : { hasShape: false, points: "", areaPath: "", trendDirection: "flat" as const };

  const tile = (
    <div
      style={{
        padding: compact ? "14px 16px" : "20px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--bg)",
        transition: "background-color 0.15s ease, border-color 0.15s ease",
        cursor: href ? "pointer" : "default",
        height: "100%",
      }}
      onMouseOver={(e) => {
        if (href) {
          e.currentTarget.style.borderColor = "var(--text-faint)";
        }
      }}
      onMouseOut={(e) => {
        if (href) {
          e.currentTarget.style.borderColor = "var(--border)";
        }
      }}
    >
      <p
        className="font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-muted)",
          marginBottom: "8px",
        }}
      >
        {label}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px", minWidth: 0 }}>
          <p
            className={mono ? "font-mono" : "font-sans"}
            style={{
              fontSize: compact ? "20px" : "28px",
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {value}
          </p>
          {unit && (
            <span
              className="font-sans"
              style={{
                fontSize: compact ? "12px" : "14px",
                fontWeight: 500,
                color: "var(--text-muted)",
              }}
            >
              {unit}
            </span>
          )}
        </div>

        {!compact && delta && (
          <DeltaChip delta={delta} isGoodWhenHigher={isGoodWhenHigher} />
        )}
      </div>

      {!compact && sparklineGeo.hasShape && (
        <div
          style={{
            marginTop: "12px",
            height: "40px",
            // Belt-and-suspenders: even if the SVG auto-sizes past 40px
            // (e.g. width:100% + viewBox aspect ratio > parent height) the
            // overflow gets clipped at the tile's bottom edge.
            overflow: "hidden",
          }}
        >
          <svg
            width="100%"
            // Explicit height locks the SVG to its parent — without it,
            // an SVG with width:100% + viewBox 120×40 inside a 200px-wide
            // tile auto-renders 67px tall (200 / 120 × 40) and bleeds
            // through the parent's bottom border.
            height="100%"
            viewBox="0 0 120 40"
            preserveAspectRatio="none"
            style={{ display: "block" }}
            aria-hidden="true"
          >
            {/* Use delta direction for color so sparkline and badge always agree.
                Intra-series trend (series[0] vs series[last]) can mislead: a single
                event at day 1 of a 14-day window looks "down" even when PoP is +100%. */}
            <path
              d={sparklineGeo.areaPath}
              fill={sparklineColor(delta?.direction ?? sparklineGeo.trendDirection, isGoodWhenHigher, 0.08)}
              stroke="none"
            />
            <polyline
              points={sparklineGeo.points}
              fill="none"
              stroke={sparklineColor(delta?.direction ?? sparklineGeo.trendDirection, isGoodWhenHigher, 1)}
              strokeWidth="1.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}
      >
        {tile}
      </Link>
    );
  }

  return tile;
}

interface DeltaChipProps {
  delta: NonNullable<KpiTileProps["delta"]>;
  isGoodWhenHigher: boolean;
}

function DeltaChip({ delta, isGoodWhenHigher }: DeltaChipProps) {
  const isGood = delta.direction === "flat"
    ? null
    : (delta.direction === "up") === isGoodWhenHigher;

  const color =
    delta.direction === "flat"
      ? "var(--text-muted)"
      : isGood
        ? "var(--success)"
        : "var(--error)";

  const Icon =
    delta.direction === "up"
      ? ArrowUpRight
      : delta.direction === "down"
        ? ArrowDownRight
        : Minus;

  const sign = delta.direction === "up" ? "+" : delta.direction === "down" ? "-" : "";
  const magnitude = Math.abs(delta.value).toFixed(1);

  return (
    <span
      className="font-mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        fontSize: "12px",
        fontWeight: 500,
        color,
        whiteSpace: "nowrap",
      }}
      title={`${delta.period}`}
      aria-label={`${sign}${magnitude}% ${delta.period}`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {sign}
      {magnitude}%
    </span>
  );
}

function sparklineColor(
  direction: "up" | "down" | "flat",
  isGoodWhenHigher: boolean,
  alpha: number
): string {
  // Sparkline tint follows the same logic as the delta chip:
  // good direction → success green; bad direction → error red; flat → muted.
  if (direction === "flat") {
    return alpha === 1 ? "var(--text-faint)" : `rgba(163,163,163,${alpha})`;
  }
  const isGood = (direction === "up") === isGoodWhenHigher;
  if (isGood) {
    return alpha === 1 ? "var(--success)" : `rgba(22,163,74,${alpha})`;
  }
  return alpha === 1 ? "var(--error)" : `rgba(220,38,38,${alpha})`;
}
