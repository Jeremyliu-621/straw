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
        const body = await res.json();
        setError(body.error ?? "Failed to load leaderboard");
        return;
      }
      const newData: LeaderboardData = await res.json();
      setData(newData);
      setError(null);
    } catch {
      setError("Network error");
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

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        {/* Header row */}
        <div
          className="grid font-sans"
          style={{
            gridTemplateColumns: "48px 1fr 100px 100px 120px",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-muted)",
            borderBottom: "1px solid var(--border)",
            padding: "12px 0",
            background: "var(--bg-subtle)",
          }}
        >
          <span style={{ textAlign: "center" }}>Rank</span>
          <span>Agent</span>
          <span style={{ textAlign: "right" }}>Test</span>
          <span style={{ textAlign: "right" }}>LLM</span>
          <span style={{ textAlign: "right", paddingRight: "12px" }}>
            Final Score
          </span>
        </div>

        {/* Data rows */}
        {data.entries.map((entry) => (
          <LeaderboardRow
            key={entry.submissionId}
            entry={entry}
            isWinner={entry.rank === 1}
          />
        ))}
      </div>
    </div>
  );
}

function LeaderboardRow({
  entry,
  isWinner,
}: {
  entry: LeaderboardEntry;
  isWinner: boolean;
}) {
  return (
    <div
      className="grid font-sans"
      style={{
        gridTemplateColumns: "48px 1fr 100px 100px 120px",
        height: "56px",
        alignItems: "center",
        borderBottom: "1px solid var(--border)",
        transition: "background-color 0.15s ease",
        cursor: "default",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "var(--bg-subtle)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        className="font-mono"
        style={{
          textAlign: "center",
          fontSize: "14px",
          fontWeight: isWinner ? 600 : 400,
          color: "var(--text)",
        }}
      >
        {entry.rank}
      </span>
      <span
        className="font-sans"
        style={{
          fontSize: "15px",
          fontWeight: isWinner ? 500 : 400,
          color: "var(--text)",
        }}
      >
        {entry.agentName}
      </span>
      <span
        className="font-mono"
        style={{
          textAlign: "right",
          fontSize: "14px",
          color:
            entry.testScore !== null
              ? "var(--text)"
              : "var(--text-faint)",
        }}
      >
        {entry.testScore !== null ? entry.testScore.toFixed(1) : "\u2014"}
      </span>
      <span
        className="font-mono"
        style={{
          textAlign: "right",
          fontSize: "14px",
          color:
            entry.llmScore !== null
              ? "var(--text)"
              : "var(--text-faint)",
        }}
      >
        {entry.llmScore !== null ? entry.llmScore.toFixed(1) : "\u2014"}
      </span>
      <div style={{ textAlign: "right", paddingRight: "12px" }}>
        <span
          className="font-mono"
          style={{
            fontSize: isWinner ? "18px" : "14px",
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          {entry.finalScore.toFixed(1)}
        </span>
        {/* Score bar */}
        <div
          style={{
            marginTop: "3px",
            height: "6px",
            background: "var(--border)",
            width: "100%",
            borderRadius: "var(--radius)",
          }}
        >
          <div
            style={{
              height: "6px",
              background: "var(--accent, var(--text))",
              width: `${Math.min(entry.finalScore, 100)}%`,
              borderRadius: "var(--radius)",
              transition: "width 300ms ease",
            }}
          />
        </div>
      </div>
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
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: "56px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
            }}
          >
            <div
              className="animate-pulse"
              style={{
                height: "16px",
                width: `${60 + i * 10}%`,
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
