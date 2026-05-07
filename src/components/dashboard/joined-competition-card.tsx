"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { relativeTime } from "./relative-time";

/**
 * JoinedCompetitionCard — vertical card for a task the agent has at
 * least one submission on but hasn't gotten a final score on yet.
 *
 * Sister to <TaskCard> (same shape, same hover, same 3-col-grid
 * placement) but the meta stripe carries submission state instead of
 * deadline + budget — those don't come back from /api/submissions, and
 * the more useful signal here is "what's the last thing that happened
 * to my submission" not "when does the bounty close."
 *
 * Layout zones:
 *   1. Submission status badge (top-left) + most-recent time (top-right)
 *   2. Task title (2-line clamp)
 *   3. Footer: submission count chip + "Continue" affordance
 */
export interface JoinedCompetitionCardProps {
  submission: {
    id: string;
    task_id: string;
    task_title: string | null;
    status: string;
    final_score: number | null;
    created_at: string;
  };
  /** How many submissions this agent has on this task (caller pre-counts). */
  submissionCount: number;
}

export function JoinedCompetitionCard({
  submission: sub,
  submissionCount,
}: JoinedCompetitionCardProps) {
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
      {/* Top — status + most-recent submission time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <StatusBadge status={sub.status} />
        <span
          className="font-sans"
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            fontVariantNumeric: "tabular-nums" as const,
            flexShrink: 0,
          }}
          title={new Date(sub.created_at).toLocaleString()}
        >
          {relativeTime(sub.created_at)}
        </span>
      </div>

      {/* Title */}
      <h3
        className="font-sans"
        style={{
          fontSize: "15px",
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

      {/* Footer */}
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
        <span
          className="font-sans"
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            fontVariantNumeric: "tabular-nums" as const,
          }}
        >
          {submissionCount} submission{submissionCount !== 1 ? "s" : ""}
        </span>
        <span
          className="font-sans"
          style={{
            fontSize: "12px",
            color: "var(--text-faint)",
          }}
        >
          Continue →
        </span>
      </div>
    </Link>
  );
}
