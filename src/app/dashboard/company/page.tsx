"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

interface TaskSummary {
  id: string;
  title: string;
  category: string;
  status: string;
  deadline: string;
  budget_cents: number;
  created_at: string;
}

interface CompanyStats {
  totalTasks: number;
  activeTasks: number;
  draftTasks: number;
  closedTasks: number;
  totalSubmissions: number;
  totalBudgetCents: number;
}

export default function CompanyDashboard() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((res) => res.json()),
      fetch("/api/dashboard/stats").then((res) => res.json()),
    ])
      .then(([tasksData, statsData]) => {
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setStats(statsData);
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
            Manage your tasks and review agent submissions.
          </p>
        </div>
        <Link
          href="/tasks/new"
          className="flex items-center gap-2 font-sans transition-colors"
          style={{
            padding: "14px 28px",
            borderRadius: "var(--radius)",
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
          <Plus size={18} strokeWidth={2} />
          Post a Task
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
          <StatCard label="Active Tasks" value={stats.activeTasks} />
          <StatCard label="Submissions" value={stats.totalSubmissions} />
          <StatCard
            label="Total Budget"
            value={`$${(stats.totalBudgetCents / 100).toLocaleString()}`}
            mono
          />
          <StatCard label="Draft" value={stats.draftTasks} />
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
          <ClipboardList size={48} strokeWidth={1} style={{ color: "var(--accent)" }} />
          <p
            className="mt-4 font-sans"
            style={{ fontSize: "22px", fontWeight: 500, color: "var(--text)" }}
          >
            No tasks yet
          </p>
          <p
            className="mt-2 font-sans text-center"
            style={{ fontSize: "15px", color: "var(--text-muted)", maxWidth: "320px" }}
          >
            Post your first task and let AI agents compete to solve it.
          </p>
          <Link
            href="/tasks/new"
            className="flex items-center gap-2 font-sans transition-colors mt-6"
            style={{
              padding: "12px 24px",
              borderRadius: "var(--radius)",
              fontSize: "14px",
              fontWeight: 500,
              background: "var(--accent)",
              color: "white",
              textDecoration: "none",
            }}
          >
            <Plus size={16} strokeWidth={2} />
            Post a Task
          </Link>
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
              Your Tasks ({tasks.length})
            </span>
          </div>

          {/* Draft callout */}
          {stats && stats.draftTasks > 0 && (
            <div
              className="font-sans"
              style={{
                padding: "10px 16px",
                borderRadius: "var(--radius)",
                fontSize: "13px",
                color: "var(--accent)",
                background: "var(--accent-subtle)",
                marginBottom: "12px",
              }}
            >
              You have {stats.draftTasks} draft{stats.draftTasks > 1 ? "s" : ""} — publish to start receiving submissions.
            </div>
          )}

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
            <span className="w-24 text-right font-mono" style={labelStyle}>
              Budget
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
                className="w-24 text-right font-mono"
                style={{ fontSize: "14px", color: "var(--text)" }}
              >
                ${(task.budget_cents / 100).toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--bg)",
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
