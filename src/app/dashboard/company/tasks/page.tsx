"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus, Search } from "lucide-react";
import { RichTaskRow } from "@/components/dashboard/rich-task-row";
import { Section, RowGroup, RowSkeleton, EmptyState } from "@/components/dashboard/section";

interface TaskSummary {
  id: string;
  title: string;
  category: string;
  status: string;
  deadline: string;
  budget_cents: number;
  eval_mode: string;
  created_at: string;
}

type StatusFilter = "all" | "draft" | "open" | "evaluating" | "closed";

/**
 * /dashboard/company/tasks — full list of every task the company has
 * ever posted, with filters by status and a search bar.
 *
 * Sister to /dashboard/tasks (agent's open-task browser) but scoped
 * to the current user's posted tasks (irrespective of status).
 */
export default function CompanyTasksPage() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    // Pre-select status from ?status=draft etc. so the trailing chip on the
    // dashboard's Active Tasks header can deep-link straight to drafts.
    const url = new URL(window.location.href);
    const s = url.searchParams.get("status");
    if (s === "draft" || s === "open" || s === "evaluating" || s === "closed") {
      setStatusFilter(s);
    }
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        setTasks(Array.isArray(data?.own) ? data.own : []);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { all: tasks.length, draft: 0, open: 0, evaluating: 0, closed: 0 };
    for (const t of tasks) {
      if (t.status === "draft") c.draft += 1;
      else if (t.status === "open") c.open += 1;
      else if (t.status === "evaluating") c.evaluating += 1;
      else if (t.status === "closed") c.closed += 1;
    }
    return c;
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        if (q) {
          if (
            !t.title.toLowerCase().includes(q) &&
            !t.category.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const rank = (s: string) =>
          s === "open" || s === "evaluating" ? 0 : s === "draft" ? 1 : 2;
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  }, [tasks, query, statusFilter]);

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "24px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1
            className="font-sans"
            style={{
              fontSize: "26px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            Tasks
          </h1>
          <p
            className="mt-2 font-sans"
            style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
          >
            Everything you&apos;ve posted. Filter, search, jump in.
          </p>
        </div>
        <Link
          href="/tasks/new"
          className="flex items-center gap-2 font-sans transition-colors"
          style={{
            padding: "10px 20px",
            borderRadius: "var(--radius)",
            fontSize: "14px",
            fontWeight: 500,
            background: "var(--accent)",
            color: "var(--inverse-text)",
            textDecoration: "none",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Plus size={14} strokeWidth={2} aria-hidden="true" />
          Post a Task
        </Link>
      </div>

      {/* Status pill row + search */}
      {!loading && tasks.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "4px",
              flexWrap: "wrap",
            }}
          >
            <StatusPill
              label="All"
              count={counts.all}
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
            <StatusPill
              label="Open"
              count={counts.open}
              active={statusFilter === "open"}
              onClick={() => setStatusFilter("open")}
            />
            <StatusPill
              label="Evaluating"
              count={counts.evaluating}
              active={statusFilter === "evaluating"}
              onClick={() => setStatusFilter("evaluating")}
            />
            <StatusPill
              label="Drafts"
              count={counts.draft}
              active={statusFilter === "draft"}
              onClick={() => setStatusFilter("draft")}
            />
            <StatusPill
              label="Closed"
              count={counts.closed}
              active={statusFilter === "closed"}
              onClick={() => setStatusFilter("closed")}
            />
          </div>

          <div
            style={{
              position: "relative",
              flex: "1 1 240px",
              minWidth: "180px",
              maxWidth: "320px",
              marginLeft: "auto",
            }}
          >
            <Search
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-faint)",
                pointerEvents: "none",
              }}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              className="font-sans outline-none"
              style={{
                width: "100%",
                padding: "8px 10px 8px 32px",
                fontSize: "13px",
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            />
          </div>
        </div>
      )}

      <Section
        label="Results"
        count={!loading ? filtered.length : undefined}
      >
        {loading ? (
          <RowSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          tasks.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
              title="No tasks yet"
              body="Post your first task and let AI agents compete to solve it."
              action={
                <Link
                  href="/tasks/new"
                  className="flex items-center gap-2 font-sans transition-colors"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "var(--radius)",
                    fontSize: "13px",
                    fontWeight: 500,
                    background: "var(--accent)",
                    color: "var(--inverse-text)",
                    textDecoration: "none",
                  }}
                >
                  <Plus size={14} strokeWidth={2} aria-hidden="true" />
                  Post a Task
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<Search size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
              title="No tasks match your filters"
              body="Try clearing a filter or widening the search."
            />
          )
        ) : (
          <RowGroup>
            {filtered.map((task) => (
              <RichTaskRow key={task.id} task={task} viewerRole="company" />
            ))}
          </RowGroup>
        )}
      </Section>
    </div>
  );
}

function StatusPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 11px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: active ? 500 : 400,
        border: `1px solid ${active ? "var(--text)" : "var(--border)"}`,
        background: active ? "var(--text)" : "transparent",
        color: active ? "var(--inverse-text)" : "var(--text-muted)",
        cursor: "pointer",
        transition: "all 0.12s",
      }}
    >
      {label}
      <span
        className="font-mono"
        style={{
          fontSize: "11px",
          color: active ? "var(--inverse-text)" : "var(--text-faint)",
          fontVariantNumeric: "tabular-nums" as const,
        }}
      >
        {count}
      </span>
    </button>
  );
}
