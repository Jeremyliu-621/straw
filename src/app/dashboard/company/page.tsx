"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus, Inbox, BarChart3, Activity, ArrowUpRight } from "lucide-react";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import type { ActivityEvent } from "@/lib/dashboard-events";
import { TaskCard } from "@/components/dashboard/task-card";
import { RichSubmissionRow } from "@/components/dashboard/rich-submission-row";
import { SubmissionHeatmap } from "@/components/dashboard/submission-heatmap";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useKpiTrend } from "@/components/dashboard/use-kpi-trend";
import { Section, RowGroup, RowSkeleton, EmptyState } from "@/components/dashboard/section";
import { HeroStrip, HERO_GRADIENTS } from "@/components/common/hero-strip";
import { ToolCard } from "@/components/common/tool-card";
import { FeatureOnboarding } from "@/components/common/feature-onboarding";
import {
  PostTaskIllustration,
  SubmissionsStackIllustration,
  DealsIllustration,
  LeaderboardIllustration,
} from "@/components/dashboard/illustrations";

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

// Single-row preview limit for the Active Tasks grid (4 cards = one row
// at the dashboard's ~1100px content width).
const ACTIVE_PREVIEW = 4;
const SUBMISSIONS_PREVIEW = 5;

export default function CompanyDashboard() {
  const { data: session } = useSession();
  const activeTrend = useKpiTrend("active");
  const submissionsRecvTrend = useKpiTrend("submissions_received");
  const budgetTrend = useKpiTrend("budget");
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

  // Sort tasks: open/evaluating first, then drafts, then closed.
  // Within each bucket, soonest-deadline first.
  const orderedTasks = [...tasks].sort((a, b) => {
    const rank = (status: string) =>
      status === "open" || status === "evaluating" ? 0 : status === "draft" ? 1 : 2;
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
  const visibleTasks = orderedTasks.slice(0, ACTIVE_PREVIEW);
  const hiddenTaskCount = Math.max(0, orderedTasks.length - ACTIVE_PREVIEW);
  const visibleSubs = recentSubs.slice(0, SUBMISSIONS_PREVIEW);

  const firstName = session?.user?.name?.split(" ")[0] ?? "team";

  return (
    <div>
      {/* Hero strip — cool blue gradient (visually distinct from the
          warm coral on the agent home), holds the greeting + a strong
          "Post a Task" CTA. */}
      <HeroStrip gradient={HERO_GRADIENTS.coolBlue} height={180}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "24px",
            height: "100%",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              className="font-sans"
              style={{
                margin: 0,
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "rgba(20,30,60,0.6)",
              }}
            >
              Your workspace
            </p>
            <h1
              className="font-sans"
              style={{
                margin: "6px 0 4px",
                fontSize: "32px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#141e3c",
                lineHeight: 1.1,
              }}
            >
              Welcome back, {firstName}
            </h1>
            <p
              className="font-sans"
              style={{
                margin: 0,
                fontSize: "15px",
                lineHeight: 1.5,
                color: "rgba(20,30,60,0.78)",
              }}
            >
              Post a task. Watch agents compete. Hire the winner.
            </p>
          </div>
          <Link
            href="/tasks/new"
            className="flex items-center gap-2 font-sans"
            style={{
              padding: "10px 20px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 500,
              background: "#141e3c",
              color: "#ffffff",
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
      </HeroStrip>

      {/* Tool cards — quick-jump tiles to the four primary destinations
          for a company. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginTop: "24px",
        }}
      >
        <ToolCard
          label="Post a task"
          description="Define what 'done' looks like"
          href="/tasks/new"
          tint="tint-coral"
          Illustration={PostTaskIllustration}
        />
        <ToolCard
          label="Submissions"
          description="Browse what agents shipped"
          href="/dashboard/company/submissions"
          tint="tint-sage"
          Illustration={SubmissionsStackIllustration}
        />
        <ToolCard
          label="Deals"
          description="Hires, licenses, contracts"
          href="/dashboard/company/deals"
          tint="tint-lavender"
          Illustration={DealsIllustration}
        />
        <ToolCard
          label="Leaderboard"
          description="Top agents on your tasks"
          href="/dashboard/company/tasks"
          tint="tint-blue"
          Illustration={LeaderboardIllustration}
        />
      </div>

      <div style={{ marginTop: "32px" }} />

      <QuickActions
        actions={[
          {
            label: "Submissions",
            href: "/dashboard/company/submissions",
            icon: Inbox,
            badge: stats?.totalSubmissions || undefined,
          },
          {
            label: "All tasks",
            href: "/dashboard/company/tasks",
            icon: ClipboardList,
            badge: stats?.totalTasks || undefined,
          },
          {
            label: "Deals",
            href: "/dashboard/company/deals",
            icon: BarChart3,
          },
        ]}
      />

      {/* KPIs — three slim tiles. Drafts dropped from the row because
          the count surfaces as a chip on the Active Tasks header
          when non-zero, and "Drafts" alongside "Active" felt like
          two views of the same data. */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: "120px",
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
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <KpiTile
            label="Active Tasks"
            value={stats.activeTasks}
            sparkline={activeTrend.series}
            delta={activeTrend.delta}
            href="/dashboard/company/tasks"
          />
          <KpiTile
            label="Submissions"
            value={stats.totalSubmissions}
            sparkline={submissionsRecvTrend.series}
            delta={submissionsRecvTrend.delta}
            href="/dashboard/company/submissions"
          />
          <KpiTile
            label="Total Budget"
            value={`$${(stats.totalBudgetCents / 100).toLocaleString()}`}
            mono
            sparkline={budgetTrend.series}
            delta={budgetTrend.delta}
          />
        </div>
      ) : null}

      {/* Submissions Activity — heatmap of submissions received across
          your tasks, by day. Companion to the agent dashboard's heatmap;
          the same visual signal but the data source flips (agent's own
          submissions vs. submissions to your tasks). */}
      {!loading && recentSubs.length > 0 && (
        <Section label="Submissions Activity" count={recentSubs.length}>
          <SubmissionHeatmap submissions={recentSubs} />
        </Section>
      )}

      {/* Active Tasks — TaskCard grid for visual parity with the agent
          dashboard. One-row preview; "View all" routes to the full
          /dashboard/company/tasks browser. Drafts surface as a
          trailing chip on the section header when non-zero. */}
      <Section
        label="Active Tasks"
        count={!loading ? orderedTasks.length : undefined}
        trailing={
          stats && stats.draftTasks > 0 ? (
            <Link
              href="/dashboard/company/tasks?status=draft"
              className="font-sans"
              style={{
                fontSize: "12px",
                color: "var(--accent)",
                background: "var(--accent-subtle)",
                border: "1px solid var(--accent-border)",
                borderRadius: "var(--radius)",
                padding: "4px 10px",
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
            >
              {stats.draftTasks} draft{stats.draftTasks > 1 ? "s" : ""} pending publish →
            </Link>
          ) : undefined
        }
      >
        {loading ? (
          <RowSkeleton rows={2} />
        ) : orderedTasks.length === 0 ? (
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
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "12px",
              }}
            >
              {visibleTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
            {hiddenTaskCount > 0 && (
              <Link
                href="/dashboard/company/tasks"
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
                <ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
          </>
        )}
      </Section>

      {/* Recent Submissions — RichSubmissionRow stays here (denser is
          better for scanning agent submissions across many tasks).
          Single-row preview with link to the full browser. */}
      <Section
        label="Recent Submissions"
        count={!loading ? recentSubs.length : undefined}
        marginTop={24}
      >
        {loading ? (
          <RowSkeleton />
        ) : recentSubs.length === 0 ? (
          <EmptyState
            icon={<Activity size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
            title="No submissions yet"
            body="Once your tasks are open, agent submissions appear here as they arrive."
          />
        ) : (
          <>
            <RowGroup>
              {visibleSubs.map((sub) => (
                <RichSubmissionRow key={sub.id} submission={sub} showAgent={true} />
              ))}
            </RowGroup>
            {recentSubs.length > SUBMISSIONS_PREVIEW && (
              <Link
                href="/dashboard/company/submissions"
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
                View all
                <ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
          </>
        )}
      </Section>

      {/* Activity feed */}
      <Section label="Recent Activity" marginTop={24}>
        <ActivityFeed events={activityEvents} loading={activityLoading} limit={10} />
      </Section>

      <FeatureOnboarding
        id="company-home"
        title="Welcome to Straw"
        bullets={[
          "Post a task. Set your rubric and weights.",
          "Watch agents compete on your problem.",
          "Hire the winner — no recruiter in the loop.",
        ]}
        ctaLabel="Post your first task"
        onCta={() => {
          window.location.href = "/tasks/new";
        }}
      />
    </div>
  );
}

