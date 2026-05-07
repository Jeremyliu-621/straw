"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { relativeTime } from "./relative-time";

/**
 * RichSubmissionRow — dense row for submissions on the dashboards.
 *
 * Visual zones:
 *   ┌──────────────────┬──────────────┬──────────────┬───────────┬──────────┐
 *   │ TASK title +     │ agent display │ status       │ score +   │ time     │
 *   │ submission meta  │ name (or You) │              │ delta-bar │ ago      │
 *   └──────────────────┴──────────────┴──────────────┴───────────┴──────────┘
 *
 * The "delta-bar" under the score is a tiny inline mini-bar showing the
 * score against the [0, 100] range, color-coded:
 *   ≥80 → success
 *   ≥50 → muted
 *   <50 → warning
 *   no score → no bar
 *
 * Replaces the bare table rows on agent + company dashboards with
 * something Stripe / Vercel-style dense.
 */
export interface RichSubmissionRowProps {
  submission: {
    id: string;
    task_id: string;
    task_title: string | null;
    agent_display_name: string | null;
    status: string;
    final_score: number | null;
    created_at: string;
  };
  /**
   * Whether to show the agent name. The agent's own dashboard shows
   * "You" and skips the agent column to save space; the company
   * dashboard renders the agent's display name.
   */
  showAgent: boolean;
}

export function RichSubmissionRow({
  submission: sub,
  showAgent,
}: RichSubmissionRowProps) {
  const scoreState = scoreSeverity(sub.final_score);

  return (
    <Link
      href={`/tasks/${sub.task_id}`}
      className="flex items-center"
      style={{
        gap: "16px",
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        textDecoration: "none",
        color: "var(--text)",
        transition: "background-color 0.12s ease",
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Zone 1 — task title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="font-sans"
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {sub.task_title ?? "Untitled task"}
        </div>
        <div
          className="font-sans"
          style={{
            marginTop: "2px",
            fontSize: "12px",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>Submission</span>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <span style={{ color: "var(--text-faint)", fontFamily: "var(--font-geist-mono)" }}>
            {sub.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Zone 2 — agent name (companies only) */}
      {showAgent && (
        <div
          className="font-sans"
          style={{
            width: "140px",
            flexShrink: 0,
            fontSize: "13px",
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={sub.agent_display_name ?? "Anonymous agent"}
        >
          {sub.agent_display_name ?? "Anonymous"}
        </div>
      )}

      {/* Zone 3 — status */}
      <div style={{ width: "100px", flexShrink: 0 }}>
        <StatusBadge status={sub.status} />
      </div>

      {/* Zone 4 — score + delta-bar */}
      <div
        style={{
          width: "90px",
          flexShrink: 0,
          textAlign: "right",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "3px",
        }}
      >
        {sub.final_score != null ? (
          <>
            <span
              className="font-mono"
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: scoreState.color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {sub.final_score.toFixed(1)}
            </span>
            <ScoreBar score={sub.final_score} color={scoreState.color} />
          </>
        ) : (
          <span
            className="font-mono"
            style={{ fontSize: "13px", color: "var(--text-faint)" }}
          >
            —
          </span>
        )}
      </div>

      {/* Zone 5 — relative time */}
      <div
        className="font-sans"
        style={{
          width: "85px",
          flexShrink: 0,
          textAlign: "right",
          fontSize: "12px",
          color: "var(--text-faint)",
          fontVariantNumeric: "tabular-nums",
        }}
        title={new Date(sub.created_at).toLocaleString()}
      >
        {relativeTime(sub.created_at)}
      </div>
    </Link>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div
      style={{
        width: "60px",
        height: "3px",
        background: "var(--bg-subtle)",
        borderRadius: "2px",
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, score))}%`,
          height: "100%",
          background: color,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

/**
 * Categorize a score into a severity (color + label).
 *
 * - ≥80: success (green) — strong submission
 * - ≥50: muted (text) — middling
 * - <50: warning (amber) — needs work
 * - null: faint (gray) — not scored
 *
 * Pure — exposed for unit testing.
 */
export function scoreSeverity(score: number | null): { color: string; band: "high" | "mid" | "low" | "none" } {
  if (score == null) return { color: "var(--text-faint)", band: "none" };
  if (score >= 80) return { color: "var(--success)", band: "high" };
  if (score >= 50) return { color: "var(--text)", band: "mid" };
  return { color: "var(--warning)", band: "low" };
}
