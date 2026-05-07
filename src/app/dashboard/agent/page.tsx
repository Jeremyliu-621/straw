"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Zap } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { KpiTile } from "@/components/dashboard/kpi-tile";

interface TaskSummary {
  id: string;
  title: string;
  category: string;
  status: string;
  deadline: string;
  budget_cents: number;
}

interface AgentStats {
  tasksEntered: number;
  mySubmissions: number;
  completedSubmissions: number;
  avgScore: number | null;
}

interface SubmissionSummary {
  id: string;
  task_id: string;
  status: string;
  agent_display_name: string | null;
  task_title: string | null;
  final_score: number | null;
  created_at: string;
}

export default function AgentDashboard() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((res) => res.json()),
      fetch("/api/dashboard/stats").then((res) => res.json()),
      fetch("/api/submissions").then((res) => res.json()),
    ])
      .then(([tasksData, statsData, subsData]) => {
        setTasks(tasksData?.open ?? []);
        setStats(statsData);
        setSubmissions(Array.isArray(subsData) ? subsData : []);
      })
      .catch(() => {
        setTasks([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero section */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          paddingBottom: "24px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            className="font-sans"
            style={{
              fontSize: "28px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            Welcome back, {session?.user?.name}
          </h1>
          <p
            className="mt-2 font-sans"
            style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
          >
            Find tasks, compete, and build your reputation.
          </p>
        </div>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: "88px",
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius)",
              }}
            />
          ))}
        </div>
      ) : stats ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          {/* TODO: replace mocked sparklines with real data once
              GET /api/dashboard/kpi-trends ships (see
              tasks/dashboard-revamp-direction.md step 4). */}
          <KpiTile
            label="Tasks Entered"
            value={stats.tasksEntered}
            sparkline={mockTrend(stats.tasksEntered, "up")}
            href="/tasks"
          />
          <KpiTile
            label="Your Submissions"
            value={stats.mySubmissions}
            sparkline={mockTrend(stats.mySubmissions, "up")}
          />
          <KpiTile
            label="Completed"
            value={stats.completedSubmissions}
            sparkline={mockTrend(stats.completedSubmissions, "up")}
          />
          <KpiTile
            label="Avg Score"
            value={stats.avgScore != null ? stats.avgScore.toFixed(1) : "—"}
            mono
            sparkline={
              stats.avgScore != null ? mockTrend(stats.avgScore, "up") : undefined
            }
          />
        </div>
      ) : null}

      {/* Task table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: "56px",
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius)",
              }}
            />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center"
          style={{
            padding: "64px 20px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <Search size={48} strokeWidth={1} style={{ color: "var(--accent)" }} />
          <p
            className="mt-4 font-sans"
            style={{ fontSize: "22px", fontWeight: 500, color: "var(--text)" }}
          >
            No open tasks
          </p>
          <p
            className="mt-2 font-sans text-center"
            style={{ fontSize: "15px", color: "var(--text-muted)", maxWidth: "320px" }}
          >
            Check back soon &mdash; companies are posting new challenges regularly.
          </p>
        </div>
      ) : (
        <div>
          {/* Section header */}
          <div style={{ marginBottom: "12px" }}>
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
              Open Tasks ({tasks.length})
            </span>
          </div>

          {/* Table header */}
          <div
            className="flex items-center gap-4 px-4 py-2"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span className="flex-1 font-sans" style={labelStyle}>
              Title
            </span>
            <span className="w-28 font-sans" style={labelStyle}>
              Category
            </span>
            <span className="w-24 font-sans" style={labelStyle}>
              Status
            </span>
            <span className="w-28 text-right font-mono" style={labelStyle}>
              Budget
            </span>
            <span className="w-32 text-right font-sans" style={labelStyle}>
              Deadline
            </span>
          </div>

          {/* Table rows */}
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="flex items-center gap-4 px-4"
              style={{
                height: "56px",
                borderBottom: "1px solid var(--border)",
                textDecoration: "none",
                color: "var(--text)",
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span className="flex-1 truncate font-sans" style={{ fontSize: "15px" }}>
                {task.title}
              </span>
              <span
                className="w-28 truncate font-sans"
                style={{ fontSize: "13px", color: "var(--text-muted)" }}
              >
                {task.category}
              </span>
              <span className="w-24">
                <StatusBadge status={task.status} />
              </span>
              <span
                className="w-28 text-right font-mono"
                style={{ fontSize: "14px", color: "var(--text)" }}
              >
                ${(task.budget_cents / 100).toLocaleString()}
              </span>
              <span
                className="w-32 text-right font-sans"
                style={{ fontSize: "13px", color: "var(--text-muted)" }}
              >
                {new Date(task.deadline).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
      {/* Your Submissions */}
      {!loading && submissions.length > 0 && (
        <div style={{ marginTop: "40px" }}>
          <div style={{ marginBottom: "12px" }}>
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
              Your Submissions ({submissions.length})
            </span>
          </div>

          {/* Table header */}
          <div
            className="flex items-center gap-4 px-4 py-2"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span className="flex-1 font-sans" style={labelStyle}>
              Task
            </span>
            <span className="w-24 font-sans" style={labelStyle}>
              Status
            </span>
            <span className="w-20 text-right font-mono" style={labelStyle}>
              Score
            </span>
            <span className="w-28 text-right font-sans" style={labelStyle}>
              Submitted
            </span>
          </div>

          {/* Submission rows */}
          {submissions.map((sub) => (
            <Link
              key={sub.id}
              href={`/tasks/${sub.task_id}`}
              className="flex items-center gap-4 px-4"
              style={{
                height: "56px",
                borderBottom: "1px solid var(--border)",
                textDecoration: "none",
                color: "var(--text)",
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span className="flex-1 truncate font-sans" style={{ fontSize: "15px" }}>
                {sub.task_title || sub.agent_display_name || "Untitled"}
              </span>
              <span className="w-24">
                <StatusBadge status={sub.status} />
              </span>
              <span
                className="w-20 text-right font-mono"
                style={{
                  fontSize: "14px",
                  color: sub.final_score != null ? "var(--text)" : "var(--text-faint)",
                }}
              >
                {sub.final_score != null ? sub.final_score.toFixed(1) : "--"}
              </span>
              <span
                className="w-28 text-right font-sans"
                style={{ fontSize: "13px", color: "var(--text-muted)" }}
              >
                {new Date(sub.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}

      {!loading && submissions.length === 0 && tasks.length > 0 && (
        <div
          className="flex flex-col items-center justify-center"
          style={{
            marginTop: "40px",
            padding: "40px 20px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <Zap size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />
          <p
            className="mt-3 font-sans"
            style={{ fontSize: "16px", fontWeight: 500, color: "var(--text)" }}
          >
            No submissions yet
          </p>
          <p
            className="mt-1 font-sans text-center"
            style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "320px" }}
          >
            Pick a task above and enter the competition to get started.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Synthesize a plausible 14-point trending series from a single end value.
 *
 * This is intentionally a stand-in until `GET /api/dashboard/kpi-trends`
 * ships (direction doc step 4). It's deterministic per `endValue` so the
 * sparkline doesn't flicker between renders.
 *
 * For an "up" trend, generates a series ending at `endValue` with mild
 * monotonically-non-decreasing variance. For "down", the inverse. For
 * "flat", a flat line at `endValue`.
 */
function mockTrend(
  endValue: number | null | undefined,
  shape: "up" | "down" | "flat"
): number[] {
  if (endValue == null || !Number.isFinite(endValue)) return [];
  const N = 14;
  if (shape === "flat") return Array.from({ length: N }, () => endValue);

  // Deterministic pseudo-random based on endValue
  let seed = Math.abs(Math.floor(endValue * 31)) || 1;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const span = Math.max(1, Math.abs(endValue) * 0.25);
  const startValue = shape === "up" ? endValue - span : endValue + span;
  const series: number[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const linear = startValue + (endValue - startValue) * t;
    const jitter = (next() - 0.5) * span * 0.15;
    series.push(linear + jitter);
  }
  // Force the last point to exactly match endValue so sparkline tracks reality.
  series[N - 1] = endValue;
  return series;
}

const labelStyle = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "var(--text-muted)",
};
