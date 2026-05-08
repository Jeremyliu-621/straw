"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { computeDeadlineState } from "./rich-task-row";

/**
 * TaskCard — vertical card layout for an open task. Used in the agent
 * dashboard's Open Tasks 3-col grid (sister to RichTaskRow, which is
 * the single-line variant used elsewhere).
 *
 * Layout zones (top → bottom):
 *   1. Status badge + deadline countdown
 *   2. Title (truncate at 2 lines)
 *   3. Category + budget (footer)
 */
export interface TaskCardProps {
  task: {
    id: string;
    title: string;
    category: string;
    status: string;
    deadline: string;
    budget_cents: number;
    eval_mode?: string;
  };
}

export function TaskCard({ task }: TaskCardProps) {
  const deadline = computeDeadlineState(task.deadline);

  return (
    <Link
      href={`/tasks/${task.id}?from=dashboard`}
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
      {/* Top row — status + deadline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <StatusBadge status={task.status} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            color: deadline.urgent
              ? "var(--error)"
              : deadline.warning
                ? "var(--warning)"
                : "var(--text-muted)",
            fontVariantNumeric: "tabular-nums" as const,
          }}
          title={new Date(task.deadline).toLocaleString()}
        >
          <Calendar
            size={11}
            strokeWidth={2}
            style={{
              color: deadline.urgent ? "var(--error)" : "var(--text-faint)",
            }}
            aria-hidden="true"
          />
          <span className="font-sans">{deadline.label}</span>
        </div>
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
          // Two-line clamp — keeps card heights aligned in the grid.
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}
      >
        {task.title}
      </h3>

      {/* Footer — category + budget */}
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
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.category}
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: "13px",
            color: "var(--text)",
            fontVariantNumeric: "tabular-nums" as const,
            flexShrink: 0,
          }}
        >
          ${(task.budget_cents / 100).toLocaleString()}
        </span>
      </div>
    </Link>
  );
}
