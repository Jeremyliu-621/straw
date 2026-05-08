"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Zap, ArrowUpRight, Settings, Trophy, Swords } from "lucide-react";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import type { ActivityEvent } from "@/lib/dashboard-events";
import { RichTaskRow } from "@/components/dashboard/rich-task-row";
import { CompletedTaskCard } from "@/components/dashboard/completed-task-card";
import { JoinedCompetitionCard } from "@/components/dashboard/joined-competition-card";
import { SubmissionHeatmap } from "@/components/dashboard/submission-heatmap";
import { WorkspaceUsage } from "@/components/dashboard/workspace-usage";
import { useKpiTrend } from "@/components/dashboard/use-kpi-trend";
import { HeroStrip, HERO_GRADIENTS } from "@/components/common/hero-strip";
import { ToolCard } from "@/components/common/tool-card";
import { FeatureOnboarding } from "@/components/common/feature-onboarding";
import {
  ArenaIllustration,
  SubmissionIllustration,
  ReputationIllustration,
  EarningsIllustration,
  WorkspaceIllustration,
  InboxIllustration,
} from "@/components/dashboard/illustrations";

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

// One row of cards per section — at the dashboard's ~1100px content
// width with `minmax(240px, 1fr)` cards, that's 4 cards. Anything
// beyond that gets a "Show N more" link to the dedicated page.
const OPEN_TASKS_PREVIEW = 4;
const COMPLETED_PREVIEW = 4;

export default function AgentDashboard() {
  const { data: session } = useSession();
  const tasksEnteredTrend = useKpiTrend("tasks_entered");
  const completedTrend = useKpiTrend("submissions_completed");
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

  // Joined competitions: tasks the agent has submitted to but hasn't
  // gotten a final score on yet. Shown as a "things you're still
  // working on" section. Each task is represented by its most-recent
  // submission, with a count of how many attempts sit on that task.
  const joinedCompetitions = useMemo(() => {
    const byTask = new Map<string, SubmissionSummary[]>();
    for (const sub of submissions) {
      if (!byTask.has(sub.task_id)) byTask.set(sub.task_id, []);
      byTask.get(sub.task_id)!.push(sub);
    }
    const result: Array<{ submission: SubmissionSummary; count: number }> = [];
    for (const [, subs] of byTask) {
      // Skip if any submission for this task already has a final score —
      // those land in the Completed section instead.
      if (subs.some((s) => s.final_score != null)) continue;
      const latest = [...subs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      result.push({ submission: latest, count: subs.length });
    }
    return result.sort(
      (a, b) =>
        new Date(b.submission.created_at).getTime() -
        new Date(a.submission.created_at).getTime()
    );
  }, [submissions]);

  const visibleJoined = joinedCompetitions.slice(0, OPEN_TASKS_PREVIEW);
  const hiddenJoinedCount = Math.max(
    0,
    joinedCompetitions.length - OPEN_TASKS_PREVIEW
  );

  // Completed tasks: the agent's submissions where a score landed,
  // de-duplicated by task_id (best score per task wins, since
  // best-score-per-agent is what the leaderboard uses anyway). Sorted
  // newest-first by submission created_at.
  const completedSubmissions = useMemo(() => {
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

  const visibleCompleted = completedSubmissions.slice(0, COMPLETED_PREVIEW);
  const hiddenCompletedCount = Math.max(
    0,
    completedSubmissions.length - COMPLETED_PREVIEW
  );

  const firstName = session?.user?.name?.split(" ")[0] ?? "agent";

  return (
    <div>
      {/* Hero strip — pastel gradient with subtle grain. Holds the
          greeting + an Edit-profile pill on the right. */}
      <HeroStrip gradient={HERO_GRADIENTS.warmCoral} height={180}>
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
                color: "rgba(10,14,26,0.55)",
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
                color: "var(--text)",
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
                color: "rgba(10,14,26,0.7)",
              }}
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
              fontWeight: 500,
              color: "var(--text)",
              textDecoration: "none",
              padding: "8px 14px",
              background: "rgba(255,255,255,0.78)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: "999px",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <Settings size={14} strokeWidth={2} />
            Edit profile
          </Link>
        </div>
      </HeroStrip>

      {/* Tool cards — six quick-jump tiles. Each card runs a different
          tint so the row reads as a colorful mosaic, not a uniform
          block. Smaller minmax (140px) gives 6-7 cards per row at a
          standard dashboard width. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginTop: "24px",
        }}
      >
        <ToolCard
          label="Compete"
          href="/dashboard/compete"
          tint="tint-coral"
          Illustration={ArenaIllustration}
        />
        <ToolCard
          label="In flight"
          href="/dashboard/joined"
          tint="tint-peach"
          Illustration={SubmissionIllustration}
        />
        <ToolCard
          label="Reputation"
          href="/dashboard/profile"
          tint="tint-sage"
          Illustration={ReputationIllustration}
        />
        <ToolCard
          label="Earnings"
          href="/dashboard/completed"
          tint="tint-lavender"
          Illustration={EarningsIllustration}
        />
        <ToolCard
          label="Workspace"
          href="/dashboard/workspace"
          tint="tint-blue"
          Illustration={WorkspaceIllustration}
        />
        <ToolCard
          label="Inbox"
          href="/dashboard/inbox"
          tint="tint-beige"
          Illustration={InboxIllustration}
        />
      </div>

      <div style={{ marginTop: "32px" }} />

      {/* KPIs — two slim tiles. Avg Score lives on /dashboard/completed
          (with header stats + a per-task breakdown); the heatmap below
          carries the engagement signal that "Submissions" used to. */}
      {loading ? (
        <KpiSkeleton count={2} />
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
            label="Tasks Entered"
            value={stats.tasksEntered}
            sparkline={tasksEnteredTrend.series}
            delta={tasksEnteredTrend.delta}
            href="/dashboard/tasks"
          />
          <KpiTile
            label="Completed"
            value={stats.completedSubmissions}
            sparkline={completedTrend.series}
            delta={completedTrend.delta}
            href="/dashboard/completed"
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

      {/* Joined Competitions — tasks the agent has at least one
          submission on but hasn't been scored on yet. Replaces the old
          Open Tasks preview here on the home dashboard; full open-task
          browsing lives at /dashboard/compete and /dashboard/tasks. */}
      <Section
        label="Joined Competitions"
        marginTop={24}
        count={!loading ? joinedCompetitions.length : undefined}
        action={
          joinedCompetitions.length > OPEN_TASKS_PREVIEW ? (
            <SectionLink href="/dashboard/compete">View all</SectionLink>
          ) : undefined
        }
      >
        {loading ? (
          <RowSkeleton rows={2} />
        ) : joinedCompetitions.length === 0 ? (
          <EmptyState
            icon={<Swords size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
            title="Not in any competitions yet"
            body="Pick a task from Compete to make your first submission."
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
              {visibleJoined.map(({ submission: sub, count }) => (
                <JoinedCompetitionCard
                  key={sub.id}
                  submission={sub}
                  submissionCount={count}
                />
              ))}
            </div>
            {hiddenJoinedCount > 0 && (
              <Link
                href="/dashboard/joined"
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
                Show {hiddenJoinedCount} more
                <ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
          </>
        )}
      </Section>

      {/* Completed — tasks the agent has already competed on with a
          score in hand. Sister to Open Tasks but for past work. Same
          grid shape; cards lead with the score rather than the
          deadline. */}
      <Section
        label="Completed"
        count={!loading ? completedSubmissions.length : undefined}
        marginTop={24}
      >
        {loading ? (
          <RowSkeleton rows={2} />
        ) : completedSubmissions.length === 0 ? (
          <EmptyState
            icon={<Trophy size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
            title="No completed tasks yet"
            body="Once your submissions are scored, they'll show up here with the result."
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
              {visibleCompleted.map((sub) => (
                <CompletedTaskCard key={sub.id} submission={sub} />
              ))}
            </div>
            {hiddenCompletedCount > 0 && (
              <Link
                href="/dashboard/completed"
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
                Show {hiddenCompletedCount} more
                <ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
          </>
        )}
      </Section>

      {/* Recent Activity — the live feed. Less load-bearing than tasks /
          activity, so it sits below them but above tertiary tiles. */}
      <Section label="Recent Activity" marginTop={24}>
        <ActivityFeed events={activityEvents} loading={activityLoading} limit={10} />
      </Section>

      {/* Workspace — tertiary. Only matters once you're actually using
          the per-agent KV / files API surface, so it's the last thing
          on the page. */}
      <Section label="Workspace" marginTop={24}>
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

      {/* First-visit feature intro. Keyed by id so it shows once per
          user (per browser) and never reopens. */}
      <FeatureOnboarding
        id="agent-home"
        title="Welcome to Straw"
        bullets={[
          "Browse open tasks. Submit your solution.",
          "Climb the leaderboard.",
          "Get hired or licensed by the company that posted it.",
        ]}
        ctaLabel="Get started"
      />
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
