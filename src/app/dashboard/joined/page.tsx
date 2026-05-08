"use client";

import { useEffect, useMemo, useState } from "react";
import { Swords, Trophy } from "lucide-react";
import { JoinedCompetitionCard } from "@/components/dashboard/joined-competition-card";
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

type StatusFilter = "all" | "active" | "completed";

/**
 * /dashboard/joined — unified "every task you've competed on", split
 * into Active (no scored submission yet) and Completed (best score
 * landed). Sister to /dashboard/completed which is completed-only;
 * this is the single destination "Tasks Entered" should land on.
 */
export default function JoinedPage() {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusFilter>("all");

  useEffect(() => {
    fetch("/api/submissions")
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(Array.isArray(data) ? data : []);
      })
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, []);

  // Split into active + completed using the same dedupe semantics the
  // home dashboard uses. Best-score-per-task wins for completed; the
  // most-recent submission represents an active task.
  const { active, completed } = useMemo(() => {
    const byTask = new Map<string, SubmissionSummary[]>();
    for (const sub of submissions) {
      if (!byTask.has(sub.task_id)) byTask.set(sub.task_id, []);
      byTask.get(sub.task_id)!.push(sub);
    }

    const activeList: Array<{ submission: SubmissionSummary; count: number }> = [];
    const completedList: SubmissionSummary[] = [];
    for (const [, subs] of byTask) {
      const scored = subs.filter((s) => s.final_score != null);
      if (scored.length > 0) {
        // Take best-score-per-task as the canonical row.
        const best = scored.reduce((a, b) =>
          (a.final_score ?? 0) > (b.final_score ?? 0) ? a : b
        );
        completedList.push(best);
      } else {
        const latest = [...subs].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        activeList.push({ submission: latest, count: subs.length });
      }
    }

    activeList.sort(
      (a, b) =>
        new Date(b.submission.created_at).getTime() -
        new Date(a.submission.created_at).getTime()
    );
    completedList.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { active: activeList, completed: completedList };
  }, [submissions]);

  const total = active.length + completed.length;
  const showActive = tab === "all" || tab === "active";
  const showCompleted = tab === "all" || tab === "completed";

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          paddingBottom: "20px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "20px",
        }}
      >
        <h1
          className="font-sans"
          style={{
            fontSize: "26px",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Your competitions
        </h1>
        <p
          className="mt-2 font-sans"
          style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
        >
          Every task you&apos;ve worked on — active competitions and finished ones.
        </p>
      </div>

      {/* Filter pills */}
      {!loading && total > 0 && (
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <Pill
            label="All"
            count={total}
            active={tab === "all"}
            onClick={() => setTab("all")}
          />
          <Pill
            label="Active"
            count={active.length}
            active={tab === "active"}
            onClick={() => setTab("active")}
          />
          <Pill
            label="Completed"
            count={completed.length}
            active={tab === "completed"}
            onClick={() => setTab("completed")}
          />
        </div>
      )}

      {loading ? (
        <SkeletonGrid />
      ) : total === 0 ? (
        <EmptyState
          icon={<Swords size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
          title="No competitions yet"
          body="Pick an open task from Compete to make your first submission."
        />
      ) : (
        <>
          {showActive && active.length > 0 && (
            <Section
              label="Active"
              count={active.length}
              marginTop={tab === "all" ? 0 : 0}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: "12px",
                }}
              >
                {active.map(({ submission, count }) => (
                  <JoinedCompetitionCard
                    key={submission.id}
                    submission={submission}
                    submissionCount={count}
                  />
                ))}
              </div>
            </Section>
          )}

          {showCompleted && completed.length > 0 && (
            <Section
              label="Completed"
              count={completed.length}
              marginTop={showActive && active.length > 0 ? 32 : 0}
              trailing={
                <Trophy
                  size={14}
                  strokeWidth={2}
                  style={{ color: "var(--text-faint)" }}
                  aria-hidden="true"
                />
              }
            >
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
            </Section>
          )}

          {/* Filtered-but-empty state — e.g. tab=Active with zero active */}
          {showActive && active.length === 0 && tab === "active" && (
            <EmptyState
              icon={<Swords size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
              title="No active competitions"
              body="Once you submit to a task and it's still being scored, it shows up here."
            />
          )}
          {showCompleted && completed.length === 0 && tab === "completed" && (
            <EmptyState
              icon={<Trophy size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
              title="No completed competitions yet"
              body="Once your submissions are scored, they'll show up here with the result."
            />
          )}
        </>
      )}
    </div>
  );
}

function Pill({
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
        border: `1px solid ${active ? "#111" : "var(--border)"}`,
        background: active ? "#f7d4d0" : "transparent",
        color: active ? "#111" : "var(--text-muted)",
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

function SkeletonGrid() {
  return (
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
  );
}
