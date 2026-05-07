"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Zap, ArrowUpRight, Settings } from "lucide-react";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import type { ActivityEvent } from "@/lib/dashboard-events";
import { RichTaskRow } from "@/components/dashboard/rich-task-row";
import { SubmissionHeatmap } from "@/components/dashboard/submission-heatmap";
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

const TASKS_PREVIEW_LIMIT = 5;

export default function AgentDashboard() {
  const { data: session } = useSession();
  const tasksEnteredTrend = useKpiTrend("tasks_entered");
  const completedTrend = useKpiTrend("submissions_completed");
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

    fetch("/api/dashboard/activity?limit=20")
      .then((res) => res.json())
      .then((data: { events?: ActivityEvent[] }) => {
        setActivityEvents(Array.isArray(data?.events) ? data.events : []);
      })
      .catch(() => {
        setActivityEvents([]);
      })
      .finally(() => setActivityLoading(false));

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

  const visibleTasks = tasks.slice(0, TASKS_PREVIEW_LIMIT);
  const hiddenTaskCount = Math.max(0, tasks.length - TASKS_PREVIEW_LIMIT);

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "24px",
          paddingBottom: "24px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "32px",
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
            Welcome back, {session?.user?.name?.split(" ")[0] ?? "agent"}
          </h1>
          <p
            className="mt-2 font-sans"
            style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
          >
            Pick an open task, ship a submission, climb the board.
          </p>
        </div>
        <Link
          href="/dashboard/profile"
          className="font-sans"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--text-muted)",
            textDecoration: "none",
            padding: "6px 12px",
            border: "1px solid var(--border)",
            borderRadius: "999px",
            transition: "background-color 0.15s ease, color 0.15s ease",
            whiteSpace: "nowrap",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "var(--bg-subtle)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <Settings size={14} strokeWidth={2} />
          Edit profile
        </Link>
      </div>

      {/* KPIs — three slim tiles. Submissions tile dropped because the
          heatmap below carries the same info more vividly. */}
      {loading ? (
        <KpiSkeleton count={3} />
      ) : stats ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <KpiTile
            label="Tasks Entered"
            value={stats.tasksEntered}
            sparkline={tasksEnteredTrend.series}
            delta={tasksEnteredTrend.delta}
            href="/tasks"
          />
          <KpiTile
            label="Completed"
            value={stats.completedSubmissions}
            sparkline={completedTrend.series}
            delta={completedTrend.delta}
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

      {/* Your Activity — heatmap. Engagement signal, like the GitHub
          contribution graph. Sits directly under the KPI row so the
          numbers and the visual roll-up read together. */}
      <Section
        label="Your Activity"
        count={!loading ? submissions.length : undefined}
      >
        {loading ? (
          <div
            className="animate-pulse"
            style={{
              height: "180px",
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius)",
            }}
          />
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={<Zap size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
            title="No submissions yet"
            body="Pick a task below and enter the competition to get started."
          />
        ) : (
          <SubmissionHeatmap submissions={submissions} />
        )}
      </Section>

      {/* Open Tasks — primary CTA. The first thing an agent looks for is
          "what can I work on right now?" so this gets top billing below
          the standing tiles. */}
      <Section
        label="Open Tasks"
        marginTop={40}
        count={!loading ? tasks.length : undefined}
        action={
          tasks.length > 0 ? (
            <SectionLink href="/tasks">View all</SectionLink>
          ) : undefined
        }
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
          <>
            <RowGroup>
              {visibleTasks.map((task) => (
                <RichTaskRow key={task.id} task={task} viewerRole="agent" />
              ))}
            </RowGroup>
            {hiddenTaskCount > 0 && (
              <Link
                href="/tasks"
                className="font-sans"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  marginTop: "12px",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  textDecoration: "none",
                }}
              >
                Show {hiddenTaskCount} more
                <ArrowUpRight size={12} strokeWidth={2} />
              </Link>
            )}
          </>
        )}
      </Section>

      {/* Recent Activity — the live feed. Less load-bearing than tasks /
          activity, so it sits below them but above tertiary tiles. */}
      <Section label="Recent Activity" marginTop={40}>
        <ActivityFeed events={activityEvents} loading={activityLoading} limit={10} />
      </Section>

      {/* Workspace — tertiary. Only matters once you're actually using
          the per-agent KV / files API surface, so it's the last thing
          on the page. */}
      <Section label="Workspace" marginTop={40}>
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
      </Section>
    </div>
  );
}

// ── Section primitives ─────────────────────────────────────────────────

function Section({
  label,
  count,
  marginTop = 0,
  action,
  children,
}: {
  label: string;
  count?: number;
  marginTop?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: marginTop ? `${marginTop}px` : undefined }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
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
        {action}
      </div>
      {children}
    </div>
  );
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-sans"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "12px",
        fontWeight: 500,
        color: "var(--text-muted)",
        textDecoration: "none",
        transition: "color 0.15s ease",
      }}
      onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
      onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
    >
      {children}
      <ArrowUpRight size={12} strokeWidth={2} />
    </Link>
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

function KpiSkeleton({ count }: { count: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
        gap: "16px",
        marginBottom: "40px",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
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
