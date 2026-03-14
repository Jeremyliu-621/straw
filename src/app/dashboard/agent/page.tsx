"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

interface TaskSummary {
  id: string;
  title: string;
  category: string;
  status: string;
  deadline: string;
  budget_cents: number;
}

export default function AgentDashboard() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1
        className="font-sans"
        style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
      >
        Open Tasks
      </h1>
      <p
        className="mt-2 font-sans"
        style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
      >
        Welcome back, {session?.user?.name}. Browse tasks and compete to win.
      </p>

      {loading ? (
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ height: "48px", background: "var(--bg-subtle)", borderRadius: "6px" }}
            />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div
          className="mt-12 flex flex-col items-center justify-center py-16"
          style={{ border: "1px solid var(--border)", borderRadius: "6px" }}
        >
          <Search size={24} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
          <p
            className="mt-3 font-sans"
            style={{ fontSize: "18px", fontWeight: 500, color: "var(--text)" }}
          >
            No open tasks
          </p>
          <p
            className="mt-1 font-sans"
            style={{ fontSize: "15px", color: "var(--text-muted)" }}
          >
            Check back soon for new competitions.
          </p>
        </div>
      ) : (
        <div className="mt-8">
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

          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="flex items-center gap-4 px-4 transition-colors"
              style={{
                height: "48px",
                borderBottom: "1px solid var(--border)",
                textDecoration: "none",
                color: "var(--text)",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span className="flex-1 truncate font-sans" style={{ fontSize: "15px" }}>
                {task.title}
              </span>
              <span className="w-28 truncate font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {task.category}
              </span>
              <span className="w-24">
                <StatusBadge status={task.status} />
              </span>
              <span className="w-28 text-right font-mono" style={{ fontSize: "14px" }}>
                ${(task.budget_cents / 100).toLocaleString()}
              </span>
              <span className="w-32 text-right font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {new Date(task.deadline).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
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
