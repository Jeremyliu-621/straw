"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { relativeTime } from "./relative-time";

/**
 * RichTaskRow — dense, info-rich row for the dashboard's tasks table.
 *
 * Shape inspired by Stripe's deployments and Vercel's deployment list:
 * lots of metadata, all on one line, but structured so the eye moves
 * left → right through "what / when / how" and the trailing column is
 * always the most actionable signal (deadline countdown).
 *
 * Visual zones:
 *   ┌──────────────────┬────────────┬───────────────┬──────────────┐
 *   │ TITLE + meta     │ status +   │ submissions   │ deadline     │
 *   │ subtitle         │ eval mode  │ count + bar   │ countdown    │
 *   └──────────────────┴────────────┴───────────────┴──────────────┘
 *
 * For company-owned tasks, the meta subtitle shows category + creation
 * relative time. For agent-discoverable tasks (open browse), it shows
 * category + budget. Caller picks via `viewerRole`.
 */
export interface RichTaskRowProps {
  task: {
    id: string;
    title: string;
    category: string;
    status: string;
    deadline: string;
    budget_cents: number;
    eval_mode?: string;
    created_at?: string;
    /** When the row knows how many submissions have arrived. For company tasks, surface as a fill bar. */
    submissions_count?: number;
    /** For company tasks, the per-task quota (so we can render the "X of Y" bar). */
    submissions_quota?: number;
  };
  viewerRole: "agent" | "company";
}

export function RichTaskRow({ task, viewerRole }: RichTaskRowProps) {
  const deadlineState = computeDeadlineState(task.deadline);
  const showSubmissionsBar =
    viewerRole === "company" &&
    typeof task.submissions_count === "number" &&
    typeof task.submissions_quota === "number" &&
    task.submissions_quota > 0;

  return (
    <Link
      href={`/tasks/${task.id}`}
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
      {/* Zone 1 — title + meta */}
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
          {task.title}
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
          <span>{task.category}</span>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          {viewerRole === "company" && task.created_at ? (
            <span title={new Date(task.created_at).toLocaleString()}>
              created {relativeTime(task.created_at)}
            </span>
          ) : (
            <span className="font-mono" style={{ fontSize: "11px" }}>
              ${(task.budget_cents / 100).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Zone 2 — status + eval mode */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "150px", flexShrink: 0 }}>
        <StatusBadge status={task.status} />
        {task.eval_mode && task.eval_mode !== "llm" && <EvalModeChip mode={task.eval_mode} />}
      </div>

      {/* Zone 3 — submissions bar (company-only) or budget (agent) */}
      <div style={{ width: "120px", flexShrink: 0, textAlign: "right" }}>
        {showSubmissionsBar ? (
          <SubmissionsBar
            count={task.submissions_count!}
            quota={task.submissions_quota!}
          />
        ) : viewerRole === "company" ? (
          <span
            className="font-mono"
            style={{ fontSize: "13px", color: "var(--text)" }}
          >
            ${(task.budget_cents / 100).toLocaleString()}
          </span>
        ) : (
          <span
            className="font-mono"
            style={{ fontSize: "13px", color: "var(--text)" }}
          >
            ${(task.budget_cents / 100).toLocaleString()}
          </span>
        )}
      </div>

      {/* Zone 4 — deadline countdown */}
      <div
        style={{
          width: "110px",
          flexShrink: 0,
          textAlign: "right",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "4px",
        }}
      >
        <Calendar
          size={11}
          strokeWidth={2}
          style={{ color: deadlineState.urgent ? "var(--error)" : "var(--text-faint)" }}
        />
        <span
          className="font-sans"
          style={{
            fontSize: "12px",
            color: deadlineState.urgent
              ? "var(--error)"
              : deadlineState.warning
                ? "var(--warning)"
                : "var(--text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
          title={new Date(task.deadline).toLocaleString()}
        >
          {deadlineState.label}
        </span>
      </div>
    </Link>
  );
}

function EvalModeChip({ mode }: { mode: string }) {
  const label = mode === "container" ? "Container" : mode === "hybrid" ? "Hybrid" : mode;
  return (
    <span
      className="font-sans"
      style={{
        fontSize: "10px",
        fontWeight: 500,
        letterSpacing: "0.04em",
        color: "var(--text-faint)",
        padding: "1px 6px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function SubmissionsBar({ count, quota }: { count: number; quota: number }) {
  const fillPct = Math.min(100, (count / quota) * 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
      <span
        className="font-mono"
        style={{
          fontSize: "12px",
          color: "var(--text)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count}
        <span style={{ color: "var(--text-faint)" }}> / {quota}</span>
      </span>
      <div
        style={{
          width: "80px",
          height: "3px",
          background: "var(--bg-subtle)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            width: `${fillPct}%`,
            height: "100%",
            background: fillPct >= 80 ? "var(--success)" : "var(--text-faint)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

/**
 * Compute a human-readable deadline countdown plus urgency flags.
 *
 * - "passed" if past
 * - "urgent" if within 24h
 * - "warning" if within 72h
 * - otherwise muted
 *
 * Pure function — exposed for unit testing.
 */
export function computeDeadlineState(deadline: string, now: Date = new Date()): {
  label: string;
  urgent: boolean;
  warning: boolean;
} {
  const then = new Date(deadline);
  if (Number.isNaN(then.getTime())) {
    return { label: "—", urgent: false, warning: false };
  }
  const diffMs = then.getTime() - now.getTime();
  const past = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  let label: string;
  if (past) {
    if (absMs < DAY) label = "passed";
    else label = `passed ${Math.floor(absMs / DAY)}d`;
  } else if (absMs < HOUR) {
    label = "<1h";
  } else if (absMs < DAY) {
    label = `in ${Math.floor(absMs / HOUR)}h`;
  } else if (absMs < 7 * DAY) {
    label = `in ${Math.floor(absMs / DAY)}d`;
  } else if (absMs < 30 * DAY) {
    label = `in ${Math.floor(absMs / (7 * DAY))}w`;
  } else {
    label = then.toLocaleDateString();
  }

  return {
    label,
    urgent: !past && absMs < DAY,
    warning: !past && absMs >= DAY && absMs < 3 * DAY,
  };
}
