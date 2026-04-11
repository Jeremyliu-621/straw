"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Zap } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

interface TaskSummary {
  id: string;
  title: string;
  category: string;
  status: string;
  deadline: string;
  budget_cents: number;
}

interface AgentStats {
  openTasks: number;
  mySubmissions: number;
  completedSubmissions: number;
  avgScore: number | null;
}

interface SubmissionSummary {
  id: string;
  task_id: string;
  status: string;
  mode: string;
  agent_display_name: string | null;
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
        setTasks(Array.isArray(tasksData) ? tasksData : []);
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
        <Link
          href="/agents/profile"
          className="flex items-center gap-2 font-sans transition-colors"
          style={{
            padding: "14px 28px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 500,
            background: "var(--accent)",
            color: "white",
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            flexShrink: 0,
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Edit Profile
        </Link>
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
                borderRadius: "7px",
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
          <StatCard label="Open Tasks" value={stats.openTasks} accent />
          <StatCard label="Your Submissions" value={stats.mySubmissions} />
          <StatCard label="Completed" value={stats.completedSubmissions} />
          <StatCard
            label="Avg Score"
            value={stats.avgScore !== null ? stats.avgScore.toString() : "--"}
            mono
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
                borderRadius: "6px",
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
            borderRadius: "7px",
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
              Agent
            </span>
            <span className="w-20 font-sans" style={labelStyle}>
              Mode
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
                {sub.agent_display_name || "Unnamed Agent"}
              </span>
              <span className="w-20">
                <span
                  className="font-sans"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 500,
                    background: sub.mode === "api" ? "var(--accent-subtle, #f0f0ff)" : "var(--bg-subtle)",
                    color: sub.mode === "api" ? "var(--accent, var(--text))" : "var(--text-muted)",
                  }}
                >
                  {sub.mode === "api" ? <Zap size={10} strokeWidth={2} /> : null}
                  {sub.mode === "api" ? "API" : "Docker"}
                </span>
              </span>
              <span className="w-24">
                <StatusBadge status={sub.status} />
              </span>
              <span
                className="w-20 text-right font-mono"
                style={{
                  fontSize: "14px",
                  color: sub.final_score !== null ? "var(--text)" : "var(--text-faint)",
                }}
              >
                {sub.final_score !== null ? sub.final_score.toFixed(1) : "--"}
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
            borderRadius: "7px",
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

function StatCard({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "7px",
        border: "1px solid var(--border)",
        background: "var(--bg)",
        borderLeft: accent ? "3px solid var(--accent)" : "3px solid transparent",
      }}
    >
      <p
        className="font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-muted)",
          marginBottom: "8px",
        }}
      >
        {label}
      </p>
      <p
        className={mono ? "font-mono" : "font-sans"}
        style={{
          fontSize: "28px",
          fontWeight: 600,
          color: "var(--text)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
    </div>
  );
}

const labelStyle = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "var(--text-muted)",
};
