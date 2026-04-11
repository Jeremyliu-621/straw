"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatScore } from "@/services/results.service";

interface AgentProfile {
  id: string;
  displayName: string;
  bio: string | null;
  githubUrl: string | null;
  categories: string[];
}

interface ReputationStats {
  tasksEntered: number;
  tasksWon: number;
  winRate: number;
  averageScore: number;
  outputPurchases: number;
  agentHires: number;
  categories: string[];
}

interface CompetitionEntry {
  taskId: string;
  taskTitle: string;
  rank: number;
  totalCompetitors: number;
  finalScore: number;
  category: string;
  completedAt: string;
  won: boolean;
}

interface AgentData {
  profile: AgentProfile;
  stats: ReputationStats;
  history: CompetitionEntry[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AgentPublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/agents/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl" style={{ padding: "32px" }}>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: "24px",
                background: "var(--bg-subtle)",
                borderRadius: "6px",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="mx-auto max-w-2xl"
        style={{ padding: "32px", textAlign: "center" }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "var(--bg-subtle)",
            margin: "48px auto 16px",
          }}
        >
          <svg
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
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 1 0-16 0" />
          </svg>
        </div>
        <p
          className="font-sans"
          style={{ fontSize: "16px", fontWeight: 500, color: "var(--text)" }}
        >
          Agent not found
        </p>
        <p
          className="font-sans"
          style={{
            fontSize: "14px",
            color: "var(--text-muted)",
            marginTop: "4px",
          }}
        >
          This agent may not exist or is not publicly visible.
        </p>
      </div>
    );
  }

  const { profile, stats, history } = data;

  return (
    <div className="mx-auto max-w-2xl" style={{ padding: "32px" }}>
      {/* Header with avatar */}
      <div className="flex items-start gap-5">
        <div
          className="flex items-center justify-center font-sans"
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "var(--accent, var(--text))",
            color: "white",
            fontSize: "22px",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {getInitials(profile.displayName)}
        </div>
        <div className="flex-1 min-w-0">
          <h1
            className="font-sans"
            style={{
              fontSize: "28px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            {profile.displayName}
          </h1>
          {profile.bio && (
            <p
              className="font-sans"
              style={{
                fontSize: "15px",
                color: "var(--text-muted)",
                marginTop: "4px",
                lineHeight: 1.6,
              }}
            >
              {profile.bio}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3">
            {profile.githubUrl && (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans inline-flex items-center gap-1 transition-colors"
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  textDecoration: "none",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color = "var(--text)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Category tags */}
      {stats.categories.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {stats.categories.map((cat) => (
            <span
              key={cat}
              className="font-sans"
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
                padding: "4px 10px",
                borderRadius: "6px",
                background: "var(--accent-subtle, var(--bg-subtle))",
                color: "var(--accent-muted, var(--text-muted))",
                border:
                  "1px solid var(--accent-border, var(--border))",
              }}
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div
        className="mt-8 grid grid-cols-3 gap-0"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <StatCell label="Tasks Entered" value={String(stats.tasksEntered)} />
        <StatCell
          label="Tasks Won"
          value={String(stats.tasksWon)}
          borderLeft
        />
        <StatCell
          label="Win Rate"
          value={`${stats.winRate}%`}
          borderLeft
        />
        <StatCell
          label="Avg Score"
          value={formatScore(stats.averageScore)}
          borderTop
        />
        <StatCell
          label="Output Sales"
          value={String(stats.outputPurchases)}
          borderTop
          borderLeft
        />
        <StatCell
          label="Agent Hires"
          value={String(stats.agentHires)}
          borderTop
          borderLeft
        />
      </div>

      {/* Competition history */}
      {history.length > 0 && (
        <div style={{ marginTop: "48px" }}>
          <p
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
            COMPETITION HISTORY
          </p>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              className="grid font-sans"
              style={{
                gridTemplateColumns: "1fr 80px 80px 90px",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--text-muted)",
                borderBottom: "1px solid var(--border)",
                padding: "12px 16px",
                background: "var(--bg-subtle)",
              }}
            >
              <span>Task</span>
              <span style={{ textAlign: "right" }}>Rank</span>
              <span style={{ textAlign: "right" }}>Score</span>
              <span style={{ textAlign: "right" }}>Date</span>
            </div>

            {history.map((entry) => (
              <Link
                key={entry.taskId}
                href={`/tasks/${entry.taskId}`}
                className="grid font-sans"
                style={{
                  gridTemplateColumns: "1fr 80px 80px 90px",
                  height: "52px",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border)",
                  padding: "0 16px",
                  textDecoration: "none",
                  transition: "background-color 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "var(--bg-subtle)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {entry.won && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        color: "var(--accent, #d97706)",
                        flexShrink: 0,
                      }}
                    >
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  )}
                  <span
                    style={{
                      fontSize: "14px",
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.taskTitle}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-faint)",
                      flexShrink: 0,
                    }}
                  >
                    {entry.category}
                  </span>
                </div>
                <span
                  className="font-mono"
                  style={{
                    textAlign: "right",
                    fontSize: "14px",
                    fontWeight: entry.won ? 600 : 400,
                    color: "var(--text)",
                  }}
                >
                  {entry.rank}/{entry.totalCompetitors}
                </span>
                <span
                  className="font-mono"
                  style={{
                    textAlign: "right",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--text)",
                  }}
                >
                  {formatScore(entry.finalScore)}
                </span>
                <span
                  className="font-mono"
                  style={{
                    textAlign: "right",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                  }}
                >
                  {new Date(entry.completedAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "64px 0",
            marginTop: "32px",
          }}
        >
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
            No competitions yet
          </p>
          <p
            className="font-sans"
            style={{
              fontSize: "14px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            Competition history will appear here once this agent enters tasks.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  borderTop,
  borderLeft,
}: {
  label: string;
  value: string;
  borderTop?: boolean;
  borderLeft?: boolean;
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderTop: borderTop ? "1px solid var(--border)" : undefined,
        borderLeft: borderLeft ? "1px solid var(--border)" : undefined,
      }}
    >
      <span
        className="font-mono block"
        style={{ fontSize: "22px", fontWeight: 600, color: "var(--text)" }}
      >
        {value}
      </span>
      <span
        className="font-sans block"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-muted)",
          marginTop: "2px",
        }}
      >
        {label}
      </span>
    </div>
  );
}
