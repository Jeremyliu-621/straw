"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  FileText,
  Flag,
  Handshake,
  TrendingUp,
} from "lucide-react";
import { relativeTime } from "./relative-time";
import type { ActivityEvent, ActivityEventType } from "@/lib/dashboard-events";

// Re-export so existing call sites that imported from this module keep working.
export type { ActivityEvent, ActivityEventType } from "@/lib/dashboard-events";

export interface ActivityFeedProps {
  /** Events sorted descending by timestamp. Component does NOT re-sort — pass them in order. */
  events: ActivityEvent[];
  /** Cap on render. Default 50. Anything beyond is truncated with a "View all" affordance. */
  limit?: number;
  /** When non-null, renders a "View all" link below the truncated list. */
  viewAllHref?: string;
  /** Loading state — renders 5 skeleton rows. */
  loading?: boolean;
}

/**
 * Activity feed: filter chips + chronological event stream.
 *
 * Visual contract (per tasks/dashboard-revamp-direction.md §2 ActivityFeed):
 * - Filter chips at top: All / Submissions / Tasks / Deals / Eval failures.
 * - Each event = one line: icon + actor verb target → delta · timestamp.
 * - Tight vertical rhythm. No avatars in v1 (we don't have them stored).
 * - Empty / loading states distinct.
 */
export function ActivityFeed({
  events,
  limit = 50,
  viewAllHref,
  loading = false,
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    const wanted = FILTER_TO_TYPES[filter];
    return events.filter((e) => wanted.includes(e.type));
  }, [events, filter]);

  const limited = filtered.slice(0, limit);
  const truncated = filtered.length > limit;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
          gap: "8px",
        }}
      >
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
          Activity
          {filtered.length > 0 && (
            <span style={{ marginLeft: "8px", color: "var(--text-faint)" }}>
              ({filtered.length})
            </span>
          )}
        </span>

        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {FILTER_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={filter === opt.value}
              onClick={() => setFilter(opt.value)}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonList />
      ) : limited.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          {limited.map((event, i) => (
            <li
              key={event.id}
              style={{
                borderBottom:
                  i === limited.length - 1 ? "none" : "1px solid var(--border)",
              }}
            >
              <Row event={event} />
            </li>
          ))}
        </ul>
      )}

      {!loading && truncated && viewAllHref && (
        <Link
          href={viewAllHref}
          className="font-sans"
          style={{
            display: "inline-block",
            marginTop: "12px",
            fontSize: "13px",
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          View all {filtered.length} events →
        </Link>
      )}
    </div>
  );
}

function Row({ event }: { event: ActivityEvent }) {
  const Icon = ICONS[event.type];
  const verb = VERBS[event.type];

  return (
    <Link
      href={event.href}
      className="flex items-center"
      style={{
        gap: "12px",
        padding: "10px 12px",
        textDecoration: "none",
        color: "inherit",
        transition: "background-color 0.12s ease",
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon
        size={14}
        strokeWidth={2}
        style={{ color: ICON_COLORS[event.type], flexShrink: 0 }}
      />
      <div
        className="font-sans"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: "13px",
          color: "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: "var(--text)" }}>{event.actor.name}</span>{" "}
        <span style={{ color: "var(--text-muted)" }}>{verb}</span>{" "}
        <span style={{ color: "var(--text)" }}>{event.target.title}</span>
        {event.delta && (
          <>
            <span style={{ color: "var(--text-muted)" }}> · </span>
            <span className="font-mono" style={{ color: "var(--text)" }}>
              {event.delta}
            </span>
          </>
        )}
      </div>
      <time
        className="font-sans"
        style={{
          fontSize: "12px",
          color: "var(--text-faint)",
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
        }}
        title={new Date(event.timestamp).toLocaleString()}
      >
        {relativeTime(event.timestamp)}
      </time>
    </Link>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans"
      style={{
        padding: "3px 9px",
        borderRadius: "var(--radius)",
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.04em",
        textTransform: "uppercase" as const,
        background: active ? "var(--text)" : "transparent",
        color: active ? "var(--inverse-text)" : "var(--text-muted)",
        border: `1px solid ${active ? "var(--text)" : "var(--border)"}`,
        cursor: "pointer",
        transition: "background-color 0.12s ease, color 0.12s ease",
      }}
    >
      {label}
    </button>
  );
}

function EmptyState({ filter }: { filter: ActivityFilter }) {
  return (
    <div
      style={{
        padding: "32px 20px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        textAlign: "center",
      }}
    >
      <Activity
        size={28}
        strokeWidth={1.25}
        style={{ color: "var(--text-faint)", margin: "0 auto" }}
      />
      <p
        className="font-sans"
        style={{
          marginTop: "8px",
          fontSize: "13px",
          color: "var(--text-muted)",
        }}
      >
        {filter === "all"
          ? "No recent activity. Once tasks and submissions start moving, you'll see them here."
          : `No ${FILTER_LABEL[filter].toLowerCase()} yet.`}
      </p>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse"
          style={{
            height: "38px",
            background: i % 2 === 0 ? "var(--bg-subtle)" : "transparent",
            borderBottom: i === 4 ? "none" : "1px solid var(--border)",
          }}
        />
      ))}
    </ul>
  );
}

// ── Constants ─────────────────────────────────────────────────────────

type ActivityFilter = "all" | "submissions" | "tasks" | "deals" | "failures";

const FILTER_OPTIONS: Array<{ value: ActivityFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "submissions", label: "Submissions" },
  { value: "tasks", label: "Tasks" },
  { value: "deals", label: "Deals" },
  { value: "failures", label: "Failures" },
];

const FILTER_LABEL: Record<ActivityFilter, string> = {
  all: "Events",
  submissions: "Submissions",
  tasks: "Tasks",
  deals: "Deals",
  failures: "Failures",
};

const FILTER_TO_TYPES: Record<Exclude<ActivityFilter, "all">, ActivityEventType[]> = {
  submissions: ["submission_created", "submission_scored", "leaderboard_change"],
  tasks: ["task_published"],
  deals: ["deal_created"],
  failures: ["eval_failed"],
};

const ICONS: Record<ActivityEventType, typeof Activity> = {
  submission_created: FileText,
  submission_scored: CheckCircle2,
  task_published: Flag,
  deal_created: Handshake,
  leaderboard_change: TrendingUp,
  eval_failed: CircleAlert,
};

const ICON_COLORS: Record<ActivityEventType, string> = {
  submission_created: "var(--text-muted)",
  submission_scored: "var(--success)",
  task_published: "var(--info)",
  deal_created: "var(--text)",
  leaderboard_change: "var(--info)",
  eval_failed: "var(--error)",
};

const VERBS: Record<ActivityEventType, string> = {
  submission_created: "submitted to",
  submission_scored: "scored on",
  task_published: "published",
  deal_created: "won the bounty for",
  leaderboard_change: "moved up on",
  eval_failed: "had an eval failure on",
};
