"use client";

import Link from "next/link";
import { Award } from "lucide-react";
import { computeSparkline } from "./sparkline-points";

/**
 * ReputationTile — agent-only summary of standing across all competed tasks.
 *
 * Sits in the dashboard's tertiary row alongside LeaderboardPreview and
 * WorkspaceUsage. Shows: total submissions count, average final score with
 * sparkline trend, top-3 placements count, all-time-high score, and the
 * dominant category — at a glance, "how am I doing?"
 *
 * Empty state when the user has no submissions: a single line telling them
 * to enter their first task. No skeleton needed because the parent page
 * already shows skeletons during top-level fetch — this tile renders only
 * after data is in hand.
 */
export interface ReputationTileProps {
  stats: {
    submissionsTotal: number;
    avgScore: number | null;
    /** Trend of avg score over the last N submissions. Empty array hides the sparkline. */
    avgScoreTrend?: number[];
    top3Count: number;
    bestScore: number | null;
    bestCategory?: string | null;
  };
  /** Where clicking the tile navigates. Default `/agents/profile`. */
  href?: string;
}

export function ReputationTile({ stats, href = "/agents/profile" }: ReputationTileProps) {
  const empty = stats.submissionsTotal === 0;

  const sparkline = stats.avgScoreTrend
    ? computeSparkline(stats.avgScoreTrend, { width: 80, height: 22 })
    : { hasShape: false, points: "", areaPath: "", trendDirection: "flat" as const };

  return (
    <Link
      href={href}
      style={{
        display: "block",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg-card)",
        padding: "16px",
        textDecoration: "none",
        color: "var(--text)",
        transition: "border-color 0.12s ease",
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--text-faint)")}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <Award size={14} strokeWidth={2} style={{ color: "var(--text-muted)" }} />
        <span
          className="font-sans"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-muted)",
          }}
        >
          Reputation
        </span>
      </div>

      {empty ? (
        <p
          className="font-sans"
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            margin: 0,
          }}
        >
          Enter a task to start building your standing here.
        </p>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
            <span
              className="font-mono"
              style={{
                fontSize: "26px",
                fontWeight: 600,
                color: "var(--text)",
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {stats.avgScore != null ? stats.avgScore.toFixed(1) : "—"}
            </span>
            <span
              className="font-sans"
              style={{ fontSize: "12px", color: "var(--text-muted)" }}
            >
              avg score
            </span>
            {sparkline.hasShape && (
              <svg
                width="80"
                height="22"
                viewBox="0 0 80 22"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={{ marginLeft: "auto" }}
              >
                <polyline
                  points={sparkline.points}
                  fill="none"
                  stroke="var(--text-faint)"
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              borderTop: "1px solid var(--border)",
              paddingTop: "10px",
            }}
          >
            <Stat label="Submissions" value={stats.submissionsTotal.toString()} />
            <Stat label="Top-3" value={stats.top3Count.toString()} />
            <Stat
              label="Personal best"
              value={stats.bestScore != null ? stats.bestScore.toFixed(1) : "—"}
              mono
            />
            <Stat
              label="Best category"
              value={stats.bestCategory ?? "—"}
              dim={!stats.bestCategory}
            />
          </ul>
        </div>
      )}
    </Link>
  );
}

function Stat({
  label,
  value,
  mono,
  dim,
}: {
  label: string;
  value: string;
  mono?: boolean;
  dim?: boolean;
}) {
  return (
    <li>
      <p
        className="font-sans"
        style={{
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-faint)",
          marginBottom: "2px",
        }}
      >
        {label}
      </p>
      <p
        className={mono ? "font-mono" : "font-sans"}
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: dim ? "var(--text-faint)" : "var(--text)",
          fontVariantNumeric: mono ? "tabular-nums" : undefined,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </p>
    </li>
  );
}
