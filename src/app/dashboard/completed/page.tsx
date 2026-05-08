"use client";

import { useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { CompletedTaskCard } from "@/components/dashboard/completed-task-card";
import { Section, EmptyState } from "@/components/dashboard/section";

interface SubmissionSummary {
  id: string;
  task_id: string;
  status: string;
  agent_display_name: string | null;
  task_title: string | null;
  final_score: number | null;
  created_at: string;
}

/**
 * /dashboard/completed — full list of the agent's scored submissions.
 *
 * The agent dashboard shows the first 6 of these with a "Show N more"
 * link that lands here. Same de-dupe semantic (best score per task,
 * newest first) so the order matches what they were just looking at.
 */
export default function CompletedTasksPage() {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/submissions")
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setSubmissions([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const completed = useMemo(() => {
    const byTask = new Map<string, SubmissionSummary>();
    for (const sub of submissions) {
      if (sub.final_score == null) continue;
      const existing = byTask.get(sub.task_id);
      if (!existing || (sub.final_score ?? 0) > (existing.final_score ?? 0)) {
        byTask.set(sub.task_id, sub);
      }
    }
    return Array.from(byTask.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [submissions]);

  const stats = useMemo(() => {
    if (completed.length === 0) {
      return { count: 0, avg: null as number | null, best: null as number | null };
    }
    const scores = completed.map((c) => c.final_score ?? 0);
    return {
      count: completed.length,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      best: Math.max(...scores),
    };
  }, [completed]);

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          paddingBottom: "24px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "24px",
          gap: "16px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            className="font-sans"
            style={{
              fontSize: "28px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            Completed
          </h1>
          <p
            className="mt-2 font-sans"
            style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
          >
            Tasks you&apos;ve competed on with a score in hand.
          </p>
        </div>
        {!loading && completed.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexShrink: 0,
            }}
          >
            <HeaderStat label="Tasks" value={stats.count.toString()} />
            <HeaderStat
              label="Avg"
              value={stats.avg != null ? stats.avg.toFixed(1) : "—"}
              mono
            />
            <HeaderStat
              label="Best"
              value={stats.best != null ? stats.best.toFixed(1) : "—"}
              mono
            />
          </div>
        )}
      </div>

      <Section label="All completed" count={!loading ? completed.length : undefined}>
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  height: "140px",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                }}
              />
            ))}
          </div>
        ) : completed.length === 0 ? (
          <EmptyState
            icon={<Trophy size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
            title="No completed tasks yet"
            body="Once your submissions are scored, they'll show up here with the result."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            {completed.map((sub) => (
              <CompletedTaskCard key={sub.id} submission={sub} />
            ))}
          </div>
        )}
      </Section>
    </div>
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
