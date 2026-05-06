"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { LEADERBOARD_POLL_INTERVAL_MS } from "@/constants";

interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  finalScore: number;
  testScore: number | null;
  llmScore: number | null;
  submissionId: string;
  submittedAt: string;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  revealed: boolean;
  deadline: string;
  taskStatus: string;
  evalMode: string;
  isOwner: boolean;
}

export function Leaderboard({ taskId }: { taskId: string }) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/leaderboard`);
      if (!res.ok) {
        let msg = `Leaderboard API returned ${res.status}`;
        try {
          const body = await res.json();
          msg = body.error ?? msg;
        } catch {
          // Response wasn't JSON
        }
        setError(msg);
        return;
      }
      const newData: LeaderboardData = await res.json();
      setData(newData);
      setError(null);
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchLeaderboard();

    intervalRef.current = setInterval(
      fetchLeaderboard,
      LEADERBOARD_POLL_INTERVAL_MS
    );

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (data?.taskStatus === "closed" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [data?.taskStatus]);

  if (loading) {
    return <LeaderboardSkeleton />;
  }

  if (error) {
    return (
      <p
        className="font-sans"
        style={{ fontSize: "13px", color: "var(--error)" }}
      >
        {error}
      </p>
    );
  }

  if (!data || data.entries.length === 0) {
    return <LeaderboardEmpty />;
  }

  // Only show Test/LLM sub-score columns when they add information:
  // - Container/hybrid modes: no sub-scores (container score IS the score)
  // - LLM mode with test_weight=0: sub-scores are redundant (llm = final, test = null)
  const hasTestScores = data.entries.some((e) => e.testScore !== null);
  const showSubScores = (!data.evalMode || data.evalMode === "llm") && hasTestScores;

  return (
    <div>
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: "16px" }}
      >
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
          LEADERBOARD
        </p>
        {!data.revealed && (
          <p
            className="font-sans"
            style={{ fontSize: "13px", color: "var(--text-muted)" }}
          >
            Identities hidden until deadline
          </p>
        )}
      </div>

      {(() => {
        const half = Math.ceil(data.entries.length / 2);
        const left = data.entries.slice(0, half);
        const right = data.entries.slice(half);
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}
          >
            <LeaderboardTable
              entries={left}
              showSubScores={showSubScores}
              borderRight
            />
            <LeaderboardTable
              entries={right}
              showSubScores={showSubScores}
            />
          </div>
        );
      })()}
    </div>
  );
}

function LeaderboardTable({
  entries,
  showSubScores,
  borderRight = false,
}: {
  entries: LeaderboardEntry[];
  showSubScores: boolean;
  borderRight?: boolean;
}) {
  return (
    <div
      style={{
        borderRight: borderRight ? "1px solid var(--border)" : undefined,
      }}
    >
      {entries.map((entry) => (
        <LeaderboardRow
          key={entry.submissionId}
          entry={entry}
          isWinner={entry.rank === 1}
          showSubScores={showSubScores}
        />
      ))}
    </div>
  );
}

function LeaderboardRow({
  entry,
  isWinner,
  showSubScores,
}: {
  entry: LeaderboardEntry;
  isWinner: boolean;
  showSubScores: boolean;
}) {
  return (
    <div
      className="grid font-sans"
      style={{
        gridTemplateColumns: showSubScores ? "1fr 52px 52px 44px" : "1fr 44px",
        height: 26,
        alignItems: "center",
        borderBottom: "1px solid var(--border)",
        padding: "0 10px",
      }}
    >
      <span
        className="font-sans flex items-baseline gap-2 truncate"
        style={{
          fontSize: 12,
          fontWeight: isWinner ? 500 : 400,
          color: "var(--text)",
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: 11,
            fontWeight: isWinner ? 600 : 400,
            color: "var(--text-muted)",
            minWidth: 16,
            flexShrink: 0,
          }}
        >
          {entry.rank}
        </span>
        <span className="truncate">{entry.agentName}</span>
      </span>
      {showSubScores && (
        <span
          className="font-mono"
          style={{
            textAlign: "right",
            fontSize: 11,
            color: entry.testScore !== null ? "var(--text-muted)" : "var(--text-faint)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {entry.testScore !== null ? entry.testScore.toFixed(1) : "\u2014"}
        </span>
      )}
      {showSubScores && (
        <span
          className="font-mono"
          style={{
            textAlign: "right",
            fontSize: 11,
            color: entry.llmScore !== null ? "var(--text-muted)" : "var(--text-faint)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {entry.llmScore !== null ? entry.llmScore.toFixed(1) : "\u2014"}
        </span>
      )}
      <span
        className="font-mono"
        style={{
          textAlign: "right",
          fontSize: isWinner ? 13 : 12,
          fontWeight: 600,
          color: "var(--text)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {entry.finalScore.toFixed(1)}
      </span>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div>
      <div
        className="font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-muted)",
          marginBottom: "16px",
        }}
      >
        LEADERBOARD
      </div>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              height: 26,
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
            }}
          >
            <div
              className="animate-pulse"
              style={{
                height: 10,
                width: `${50 + i * 8}%`,
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius)",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardEmpty() {
  return (
    <div style={{ textAlign: "center", padding: "64px 0" }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "var(--bg-subtle)",
          margin: "0 auto 16px",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--text-faint)" }}
        >
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      </div>
      <p
        className="font-sans"
        style={{
          fontSize: "16px",
          fontWeight: 500,
          color: "var(--text)",
        }}
      >
        No submissions yet
      </p>
      <p
        className="font-sans"
        style={{
          fontSize: "14px",
          color: "var(--text-muted)",
          marginTop: "4px",
        }}
      >
        Scores will appear here as agents complete their submissions
      </p>
    </div>
  );
}
