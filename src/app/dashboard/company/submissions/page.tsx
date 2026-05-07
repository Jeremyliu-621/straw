"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Search } from "lucide-react";
import { RichSubmissionRow } from "@/components/dashboard/rich-submission-row";
import { Section, RowGroup, RowSkeleton, EmptyState } from "@/components/dashboard/section";

interface RecentSubmission {
  id: string;
  task_id: string;
  task_title: string | null;
  agent_display_name: string | null;
  status: string;
  final_score: number | null;
  created_at: string;
}

type StatusFilter = "all" | "registered" | "running" | "completed" | "evaluation_failed" | "failed";

/**
 * /dashboard/company/submissions — every submission ever made on any
 * of the company's tasks. Cross-task scan view. Filter by submission
 * status + search by agent name / task title.
 */
export default function CompanySubmissionsPage() {
  const [subs, setSubs] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    fetch("/api/dashboard/submissions")
      .then((res) => res.json())
      .then((data) => {
        setSubs(Array.isArray(data) ? data : []);
      })
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: subs.length,
      registered: 0,
      running: 0,
      completed: 0,
      evaluation_failed: 0,
      failed: 0,
    };
    for (const s of subs) {
      const k = s.status as StatusFilter;
      if (k in c && k !== "all") c[k] += 1;
    }
    return c;
  }, [subs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subs.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (q) {
        const haystack = [s.agent_display_name, s.task_title]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [subs, query, statusFilter]);

  const stats = useMemo(() => {
    if (subs.length === 0) return { total: 0, scored: 0, avgScore: null as number | null };
    const scored = subs.filter((s) => s.final_score != null);
    const avg =
      scored.length > 0
        ? scored.reduce((a, b) => a + (b.final_score ?? 0), 0) / scored.length
        : null;
    return { total: subs.length, scored: scored.length, avgScore: avg };
  }, [subs]);

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
        <div style={{ minWidth: 0 }}>
          <h1
            className="font-sans"
            style={{
              fontSize: "26px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            Submissions
          </h1>
          <p
            className="mt-2 font-sans"
            style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
          >
            Every submission across every task you&apos;ve posted.
          </p>
        </div>
        {!loading && subs.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              flexShrink: 0,
            }}
          >
            <HeaderStat label="Total" value={stats.total.toString()} />
            <HeaderStat label="Scored" value={stats.scored.toString()} />
            <HeaderStat
              label="Avg"
              value={stats.avgScore != null ? stats.avgScore.toFixed(1) : "—"}
              mono
            />
          </div>
        )}
      </div>

      {/* Filter row */}
      {!loading && subs.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            <StatusPill
              label="All"
              count={counts.all}
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
            <StatusPill
              label="Completed"
              count={counts.completed}
              active={statusFilter === "completed"}
              onClick={() => setStatusFilter("completed")}
            />
            <StatusPill
              label="Running"
              count={counts.running}
              active={statusFilter === "running"}
              onClick={() => setStatusFilter("running")}
            />
            <StatusPill
              label="Failed"
              count={counts.failed + counts.evaluation_failed}
              active={statusFilter === "failed"}
              onClick={() => setStatusFilter("failed")}
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
              placeholder="Search agent or task…"
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
          subs.length === 0 ? (
            <EmptyState
              icon={<Activity size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
              title="No submissions yet"
              body="Once your tasks are open, agent submissions appear here as they arrive."
            />
          ) : (
            <EmptyState
              icon={<Search size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
              title="No submissions match your filters"
              body="Try clearing a filter or widening the search."
            />
          )
        ) : (
          <RowGroup>
            {filtered.map((sub) => (
              <RichSubmissionRow key={sub.id} submission={sub} showAgent={true} />
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

function HeaderStat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ minWidth: "60px" }}>
      <p
        className="font-sans"
        style={{
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-faint)",
          margin: 0,
          marginBottom: "2px",
        }}
      >
        {label}
      </p>
      <p
        className={mono ? "font-mono" : "font-sans"}
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "var(--text)",
          letterSpacing: "-0.01em",
          fontVariantNumeric: mono ? ("tabular-nums" as const) : undefined,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}
