"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus, Inbox, FileEdit, BarChart3 } from "lucide-react";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import type { ActivityEvent } from "@/lib/dashboard-events";
import { RichTaskRow } from "@/components/dashboard/rich-task-row";
import { RichSubmissionRow } from "@/components/dashboard/rich-submission-row";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useKpiTrend } from "@/components/dashboard/use-kpi-trend";

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

interface CompanyStats {
  totalTasks: number;
  activeTasks: number;
  draftTasks: number;
  closedTasks: number;
  totalSubmissions: number;
  totalBudgetCents: number;
}

interface RecentSubmission {
  id: string;
  task_id: string;
  task_title: string | null;
  agent_display_name: string | null;
  status: string;
  final_score: number | null;
  created_at: string;
}

export default function CompanyDashboard() {
  const { data: session } = useSession();
  const activeTrend = useKpiTrend("active");
  const submissionsRecvTrend = useKpiTrend("submissions_received");
  const budgetTrend = useKpiTrend("budget");
  const draftsTrend = useKpiTrend("drafts");
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [recentSubs, setRecentSubs] = useState<RecentSubmission[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((res) => res.json()),
      fetch("/api/dashboard/stats").then((res) => res.json()),
      fetch("/api/dashboard/submissions").then((res) => res.json()),
    ])
      .then(([tasksData, statsData, subsData]) => {
        setTasks(tasksData?.own ?? []);
        setStats(statsData);
        setRecentSubs(Array.isArray(subsData) ? subsData : []);
      })
      .catch(() => {
        setTasks([]);
      })
      .finally(() => setLoading(false));

    // Activity feed lands independent of the rest so the top stats are
    // not gated on the union query's cost.
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

      <QuickActions
        actions={[
          {
            label: "Pending submissions",
            href: "/dashboard/company#recent",
            icon: Inbox,
            badge: stats?.totalSubmissions || undefined,
            hint: "Latest agent submissions across your tasks",
          },
          {
            label: "Drafts",
            href: "/dashboard/company",
            icon: FileEdit,
            badge: stats?.draftTasks || undefined,
            hint: "Unpublished task drafts",
          },
          {
            label: "Leaderboards",
            href: "/dashboard/company",
            icon: BarChart3,
            hint: "Per-task agent rankings",
          },
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
          <KpiTile
            label="Active Tasks"
            value={stats.activeTasks}
            sparkline={activeTrend.series}
            delta={activeTrend.delta}
            href="/dashboard/company"
          />
          <KpiTile
            label="Submissions"
            value={stats.totalSubmissions}
            sparkline={submissionsRecvTrend.series}
            delta={submissionsRecvTrend.delta}
          />
          <KpiTile
            label="Total Budget"
            value={`$${(stats.totalBudgetCents / 100).toLocaleString()}`}
            mono
            sparkline={budgetTrend.series}
            delta={budgetTrend.delta}
          />
          <KpiTile
            label="Drafts"
            value={stats.draftTasks}
            // Drafts trending up is BAD — companies shouldn't accumulate
            // unpublished drafts. Coloring follows.
            isGoodWhenHigher={false}
            sparkline={draftsTrend.series}
            delta={draftsTrend.delta}
            href="/dashboard/company"
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

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}
          >
            {tasks.map((task) => (
              <RichTaskRow key={task.id} task={task} viewerRole="company" />
            ))}
          </div>
        </div>
      )}

      {/* Activity feed — fed by /api/dashboard/activity (step 3 done). */}
      <div style={{ marginTop: "40px" }}>
        <ActivityFeed events={activityEvents} loading={activityLoading} limit={10} />
      </div>

      {/* Recent Submissions */}
      {!loading && recentSubs.length > 0 && (
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
              Recent Submissions ({recentSubs.length})
            </span>
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}
          >
            {recentSubs.map((sub) => (
              <RichSubmissionRow key={sub.id} submission={sub} showAgent={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

