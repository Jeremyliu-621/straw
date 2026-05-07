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
import { useKpiTrend } from "@/components/dashboard/use-kpi-trend";

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
  bestScore: number | null;
  top3Count: number;
  bestCategory: string | null;
}

interface WorkspaceQuota {
  bytes_used: number;
  bytes_limit: number;
  keys_used?: number;
  keys_limit?: number;
  files_used?: number;
  files_limit?: number;
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
  const submissionsTrend = useKpiTrend("submissions");
  const scoreTrend = useKpiTrend("score");
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [kvQuota, setKvQuota] = useState<WorkspaceQuota | null>(null);
  const [filesQuota, setFilesQuota] = useState<WorkspaceQuota | null>(null);
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

    // Workspace quotas — agent-only tertiary tile data. Failures here
    // don't surface to the user; WorkspaceUsage falls back to its empty
    // state on null/zero values.
    Promise.all([
      fetch("/api/v1/workspace/quota").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/v1/workspace/files/quota").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([kv, files]) => {
        setKvQuota(kv as WorkspaceQuota | null);
        setFilesQuota(files as WorkspaceQuota | null);
      })
      .catch(() => {
        // swallow — empty state is fine
      });
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
          {/* Tasks Entered + Completed still use mockTrend — they need
              their own metrics on /api/dashboard/kpi-trends (tasks-entered:
              count distinct task_id per day; completed: count where
              status=completed per day). Tracked as next /loop iteration. */}
          <KpiTile
            label="Tasks Entered"
            value={stats.tasksEntered}
            sparkline={mockTrend(stats.tasksEntered, "up")}
            href="/tasks"
          />
          <KpiTile
            label="Your Submissions"
            value={stats.mySubmissions}
            sparkline={submissionsTrend.series}
            delta={submissionsTrend.delta}
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
            sparkline={scoreTrend.series}
            delta={scoreTrend.delta}
          />
        </div>
      ) : null}

      {/* Standing tiles — Reputation + Workspace. Sit between the KPI row
          and the tasks list because they're "about you" context: how you
          measure up across all tasks, plus your persistent workspace
          state. Each tile self-renders an empty state when data is
          missing, so this row is safe to mount as soon as `stats` lands. */}
      {!loading && stats && (
        <div
          style={{
            marginBottom: "32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          <ReputationTile
            stats={{
              submissionsTotal: stats.mySubmissions,
              avgScore: stats.avgScore,
              avgScoreTrend: scoreTrend.series.length > 0 ? scoreTrend.series : undefined,
              top3Count: stats.top3Count,
              bestScore: stats.bestScore,
              bestCategory: stats.bestCategory,
            }}
          />
          <WorkspaceUsage
            kv={{
              bytesUsed: kvQuota?.bytes_used ?? 0,
              bytesLimit: kvQuota?.bytes_limit ?? 10 * 1024 * 1024,
              keysUsed: kvQuota?.keys_used ?? 0,
              keysLimit: kvQuota?.keys_limit ?? 10000,
            }}
            files={{
              bytesUsed: filesQuota?.bytes_used ?? 0,
              bytesLimit: filesQuota?.bytes_limit ?? 100 * 1024 * 1024,
              filesUsed: filesQuota?.files_used ?? 0,
              filesLimit: filesQuota?.files_limit ?? 1000,
            }}
          />
        </div>
      )}

      {/* Your Submissions — always rendered (empty state when 0) so the
          dashboard has a stable section for "what you've put out there".
          Reading order: above Open Tasks because your own work is the
          first thing you check after the standing tiles, then you see
          what's available to compete on. */}
      <Section
        label="Your Submissions"
        count={!loading ? submissions.length : undefined}
      >
        {loading ? (
          <RowSkeleton rows={3} />
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={<Zap size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
            title="No submissions yet"
            body="Pick a task below and enter the competition to get started."
          />
        ) : (
          <RowGroup>
            {submissions.map((sub) => (
              <RichSubmissionRow key={sub.id} submission={sub} showAgent={false} />
            ))}
          </RowGroup>
        )}
      </Section>

      {/* Open Tasks — always rendered (empty state when 0). The bounty
          board: what you can compete on right now. */}
      <Section
        label="Open Tasks"
        count={!loading ? tasks.length : undefined}
        marginTop={32}
      >
        {loading ? (
          <RowSkeleton rows={3} />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<Search size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
            title="No open tasks"
            body="Check back soon — companies are posting new challenges regularly."
          />
        ) : (
          <RowGroup>
            {tasks.map((task) => (
              <RichTaskRow key={task.id} task={task} viewerRole="agent" />
            ))}
          </RowGroup>
        )}
      </Section>

      {/* Activity feed — fed by /api/dashboard/activity (step 3 done). */}
      <div style={{ marginTop: "32px" }}>
        <ActivityFeed events={activityEvents} loading={activityLoading} limit={10} />
      </div>
    </div>
  );
}

// ── Section primitives ─────────────────────────────────────────────────
//
// Each named section on the dashboard renders the same small header
// (uppercase label + optional count chip) and consistent spacing. Pulled
// out of inline JSX so the page reads as a list of intent-named blocks
// rather than a wall of div+style.

function Section({
  label,
  count,
  marginTop = 0,
  children,
}: {
  label: string;
  count?: number;
  marginTop?: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: marginTop ? `${marginTop}px` : undefined }}>
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
          {label}
          {typeof count === "number" && (
            <span style={{ marginLeft: "8px", color: "var(--text-faint)" }}>({count})</span>
          )}
        </span>
      </div>
      {children}
    </div>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function RowSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
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
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        padding: "40px 20px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      {icon}
      <p
        className="mt-3 font-sans"
        style={{ fontSize: "16px", fontWeight: 500, color: "var(--text)" }}
      >
        {title}
      </p>
      <p
        className="mt-1 font-sans text-center"
        style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "320px" }}
      >
        {body}
      </p>
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
