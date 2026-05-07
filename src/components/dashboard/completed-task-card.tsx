"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { relativeTime } from "./relative-time";
import { scoreSeverity } from "./rich-submission-row";

/**
 * CompletedTaskCard — vertical card variant for a task the agent has
 * already competed on and gotten a score back. Sister to <TaskCard>
 * (which is for open tasks) — same shape, different content priority.
 *
 * Layout zones (top → bottom):
 *   1. Score (large, color-coded by band) + status badge + relative time
 *   2. Task title (2-line clamp)
 *   3. Score-band mini-bar across the card width
 */
export interface CompletedTaskCardProps {
  submission: {
    id: string;
    task_id: string;
    task_title: string | null;
    final_score: number | null;
    status: string;
    created_at: string;
  };
}

export function CompletedTaskCard({ submission: sub }: CompletedTaskCardProps) {
  const scoreState = scoreSeverity(sub.final_score);
  const fill = sub.final_score != null
    ? Math.min(100, Math.max(0, sub.final_score))
    : 0;

  return (
    <Link
      href={`/tasks/${sub.task_id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg)",
        textDecoration: "none",
        color: "var(--text)",
        minHeight: "140px",
        transition: "background-color 0.12s ease, border-color 0.12s ease",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "var(--bg-subtle)";
        e.currentTarget.style.borderColor = "var(--text-faint)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "var(--bg)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Top row — score + status + time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: scoreState.color,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums" as const,
            lineHeight: 1,
          }}
        >
          {sub.final_score != null ? sub.final_score.toFixed(1) : "—"}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <StatusBadge status={sub.status} />
        </div>
      </div>

      {/* Title */}
      <h3
        className="font-sans"
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "var(--text)",
          lineHeight: 1.35,
          margin: 0,
          flex: 1,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}
      >
        {sub.task_title ?? "Untitled task"}
      </h3>

      {/* Footer — score bar + relative time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          paddingTop: "10px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            flex: 1,
            height: "3px",
            background: "var(--bg-subtle)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
          aria-hidden="true"
        >
          <div
            style={{
              width: `${fill}%`,
              height: "100%",
              background: scoreState.color,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span
          className="font-sans"
          style={{
            fontSize: "11px",
            color: "var(--text-faint)",
            fontVariantNumeric: "tabular-nums" as const,
            flexShrink: 0,
          }}
          title={new Date(sub.created_at).toLocaleString()}
        >
          {relativeTime(sub.created_at)}
        </span>
      </div>
    </Link>
  );
}
