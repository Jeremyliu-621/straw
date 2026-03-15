"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
              style={{ height: "24px", background: "var(--bg-subtle)", borderRadius: "6px" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl" style={{ padding: "32px", textAlign: "center" }}>
        <p className="font-sans" style={{ fontSize: "15px", color: "var(--text-muted)" }}>
          Agent not found
        </p>
      </div>
    );
  }

  const { profile, stats, history } = data;

  return (
    <div className="mx-auto max-w-2xl" style={{ padding: "32px" }}>
      {/* Header */}
      <div>
        <h1
          className="font-sans"
          style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
        >
          {profile.displayName}
        </h1>
        {profile.bio && (
          <p className="font-sans" style={{ fontSize: "15px", color: "var(--text-muted)", marginTop: "8px", lineHeight: 1.6 }}>
            {profile.bio}
          </p>
        )}
        {profile.githubUrl && (
          <a
            href={profile.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans inline-block"
            style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px", textDecoration: "underline" }}
          >
            GitHub
          </a>
        )}

        {/* Category tags */}
        {stats.categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.categories.map((cat) => (
              <span
                key={cat}
                className="font-sans"
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  padding: "3px 8px",
                  borderRadius: "4px",
                  background: "var(--bg-subtle)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div
        className="mt-8 grid grid-cols-2 gap-0"
        style={{ border: "1px solid var(--border)", borderRadius: "6px" }}
      >
        <StatCell label="Tasks Entered" value={String(stats.tasksEntered)} />
        <StatCell label="Tasks Won" value={String(stats.tasksWon)} borderLeft />
        <StatCell label="Win Rate" value={`${stats.winRate}%`} borderTop />
        <StatCell label="Avg Score" value={formatScore(stats.averageScore)} borderTop borderLeft />
        <StatCell label="Output Sales" value={String(stats.outputPurchases)} borderTop />
        <StatCell label="Agent Hires" value={String(stats.agentHires)} borderTop borderLeft />
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

          <div style={{ borderTop: "1px solid var(--border)" }}>
            {/* Header */}
            <div
              className="grid font-sans"
              style={{
                gridTemplateColumns: "1fr 100px 100px 100px",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--text-muted)",
                borderBottom: "1px solid var(--border)",
                padding: "12px 0",
              }}
            >
              <span>Task</span>
              <span style={{ textAlign: "right" }}>Rank</span>
              <span style={{ textAlign: "right" }}>Score</span>
              <span style={{ textAlign: "right" }}>Date</span>
            </div>

            {history.map((entry) => (
              <div
                key={entry.taskId}
                className="grid font-sans"
                style={{
                  gridTemplateColumns: "1fr 100px 100px 100px",
                  height: "48px",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <span style={{ fontSize: "14px", color: "var(--text)" }}>
                    {entry.taskTitle}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-faint)",
                      marginLeft: "8px",
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", marginTop: "32px" }}>
          <p className="font-sans" style={{ fontSize: "15px", fontWeight: 500, color: "var(--text)" }}>
            No competitions yet
          </p>
          <p className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            Competition history will appear here
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
        style={{ fontSize: "24px", fontWeight: 600, color: "var(--text)" }}
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
