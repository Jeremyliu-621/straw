"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";

/**
 * LeaderboardPreview — top-N entries for a single task, rendered as a
 * compact card. Drops onto the dashboard's tertiary row (right column or
 * below the activity feed depending on layout).
 *
 * Visual: header (task title + total entries + "View full →" link) plus a
 * tight numbered list — rank, agent name, score with mini-bar.
 *
 * Empty state: "No submissions yet. Once agents enter, the leaderboard will
 * fill in here." Component handles the empty case so the caller doesn't
 * have to guard.
 */
export interface LeaderboardEntry {
  rank: number;
  agentName: string;
  finalScore: number;
  /** Optional: marks the viewer's own row for own-position highlighting. */
  isYou?: boolean;
}

export interface LeaderboardPreviewProps {
  taskId: string;
  taskTitle: string;
  /** Sorted descending by score. Pass at most `limit` entries; component shows them all. */
  entries: LeaderboardEntry[];
  /** Total number of submissions across the leaderboard, for the "View full" link. */
  totalEntries?: number;
  /** Visual cap — defaults to 5. Caller is responsible for slicing entries[]. */
  limit?: number;
  /** Loading state — renders 5 skeleton rows. */
  loading?: boolean;
}

export function LeaderboardPreview({
  taskId,
  taskTitle,
  entries,
  totalEntries,
  limit = 5,
  loading = false,
}: LeaderboardPreviewProps) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg)",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <Trophy size={14} strokeWidth={2} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p
              className="font-sans"
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--text-muted)",
              }}
            >
              Leaderboard
            </p>
            <p
              className="font-sans"
              style={{
                marginTop: "1px",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={taskTitle}
            >
              {taskTitle}
            </p>
          </div>
        </div>
        {(totalEntries ?? entries.length) > limit && (
          <Link
            href={`/tasks/${taskId}?from=dashboard`}
            className="font-sans"
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              textDecoration: "none",
              flexShrink: 0,
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            View all →
          </Link>
        )}
      </div>

      {loading ? (
        <SkeletonList />
      ) : entries.length === 0 ? (
        <p
          className="font-sans"
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            padding: "12px 0",
            textAlign: "center",
          }}
        >
          No submissions yet. The leaderboard fills in as agents compete.
        </p>
      ) : (
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {entries.slice(0, limit).map((entry) => (
            <Row key={`${entry.rank}-${entry.agentName}`} entry={entry} />
          ))}
        </ol>
      )}
    </div>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  const fill = Math.min(100, Math.max(0, entry.finalScore));
  const barColor = entry.finalScore >= 80 ? "var(--success)" : "var(--text-muted)";

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 0",
        borderBottom: "none",
      }}
    >
      <RankBadge rank={entry.rank} highlight={entry.isYou ?? false} />
      <span
        className="font-sans"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: "13px",
          color: entry.isYou ? "var(--text)" : "var(--text-muted)",
          fontWeight: entry.isYou ? 500 : 400,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {entry.agentName}
        {entry.isYou && (
          <span
            style={{
              marginLeft: "6px",
              fontSize: "10px",
              color: "var(--text-faint)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            you
          </span>
        )}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
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
              width: `${fill}%`,
              height: "100%",
              background: barColor,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span
          className="font-mono"
          style={{
            fontSize: "12px",
            color: "var(--text)",
            fontVariantNumeric: "tabular-nums",
            minWidth: "32px",
            textAlign: "right",
          }}
        >
          {entry.finalScore.toFixed(1)}
        </span>
      </div>
    </li>
  );
}

function RankBadge({ rank, highlight }: { rank: number; highlight: boolean }) {
  return (
    <span
      className="font-mono"
      style={{
        width: "20px",
        height: "20px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 500,
        color: highlight ? "var(--inverse-text)" : "var(--text-muted)",
        background: highlight ? "var(--text)" : "var(--bg-subtle)",
        border: `1px solid ${highlight ? "var(--text)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        flexShrink: 0,
      }}
    >
      {rank}
    </span>
  );
}

function SkeletonList() {
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse"
          style={{
            height: "26px",
            background: i % 2 === 0 ? "var(--bg-subtle)" : "transparent",
            borderRadius: "var(--radius)",
            marginBottom: "4px",
          }}
        />
      ))}
    </ol>
  );
}
