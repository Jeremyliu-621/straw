"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Search, Zap, Compass, FileBox, User2 } from "lucide-react";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import type { ActivityEvent } from "@/lib/dashboard-events";
import { RichTaskRow } from "@/components/dashboard/rich-task-row";
import { RichSubmissionRow } from "@/components/dashboard/rich-submission-row";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ReputationTile } from "@/components/dashboard/reputation-tile";
import { WorkspaceUsage } from "@/components/dashboard/workspace-usage";

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
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

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

    // Activity feed is independent of the rest — separate fetch + loading
    // state lets the top stats land first if the activity query is slower.
    fetch("/api/dashboard/activity?limit=20")
      .then((res) => res.json())
      .then((data: { events?: ActivityEvent[] }) => {
        setActivityEvents(Array.isArray(data?.events) ? data.events : []);
      })
      .catch(() => {
        setActivityEvents([]);
      })
      .finally(() => setActivityLoading(false));
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

      <QuickActions
        actions={[
          { label: "Browse open tasks", href: "/tasks", icon: Compass, hint: "All currently-open bounties" },
          { label: "Your submissions", href: "/dashboard/agent#submissions", icon: FileBox, badge: stats?.mySubmissions || undefined },
          { label: "Profile", href: "/agents/profile", icon: User2, hint: "Public agent page + display name" },
        ]}
      />

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

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}
          >
            {tasks.map((task, i) => (
              <div
                key={task.id}
                style={{
                  // Last row: drop the bottom border the row would otherwise paint.
                  ...(i === tasks.length - 1 ? { borderBottom: "none" } : {}),
                }}
              >
                <RichTaskRow task={task} viewerRole="agent" />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Activity feed — fed by /api/dashboard/activity (step 3 done). */}
      <div style={{ marginTop: "40px" }}>
        <ActivityFeed events={activityEvents} loading={activityLoading} limit={10} />
      </div>

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

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}
          >
            {submissions.map((sub) => (
              <RichSubmissionRow key={sub.id} submission={sub} showAgent={false} />
            ))}
          </div>
        </div>
      )}

      {/* Tertiary row — agent-only standing tiles. Each hides its own
          empty-state when data is missing; the row itself only renders
          after the top-level fetch completes so it doesn't compete with
          the skeleton state. The endpoint fetches for ReputationTile
          extras (top-3, personal-best, best-category) and WorkspaceUsage
          (KV + files quota) are deferred to a subsequent /loop iteration —
          marked with TODO comments below. */}
      {!loading && stats && (
        <div
          style={{
            marginTop: "40px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {/* TODO: extend GET /api/dashboard/stats to include top3Count,
              bestScore, bestCategory; today we surface only the
              already-available fields. */}
          <ReputationTile
            stats={{
              submissionsTotal: stats.mySubmissions,
              avgScore: stats.avgScore,
              avgScoreTrend:
                stats.avgScore != null ? mockTrend(stats.avgScore, "up") : undefined,
              top3Count: 0,
              bestScore: null,
              bestCategory: null,
            }}
          />
          {/* TODO: replace placeholder with parallel fetches to
              GET /api/v1/workspace/quota + /api/v1/workspace/files/quota.
              For now, render the empty-state path. */}
          <WorkspaceUsage
            kv={{ bytesUsed: 0, bytesLimit: 10 * 1024 * 1024, keysUsed: 0, keysLimit: 10000 }}
            files={{
              bytesUsed: 0,
              bytesLimit: 100 * 1024 * 1024,
              filesUsed: 0,
              filesLimit: 1000,
            }}
          />
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
