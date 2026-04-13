"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { useArena } from "../ArenaProvider";
import { MockStatusBadge, AnimatedStatCard, SectionHeader, LABEL_STYLE, TableHeader } from "../shared";
import { MOCK_TASKS, MOCK_SUBMISSIONS, TEASER_SUBMISSIONS, AGENT_STATS } from "../data";

const ROW_SPRING = { type: "spring" as const, stiffness: 300, damping: 24 };

export default function AgentDashboard() {
  const { navigate, intro } = useArena();
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);
  const [hoveredSub, setHoveredSub] = useState<number | null>(null);

  const isCounting = intro.phase === "counting";
  const isDone = intro.phase === "done";
  const visibleTasks = isDone ? MOCK_TASKS : MOCK_TASKS.slice(0, intro.visibleTasks);
  const visibleSubs = isDone ? MOCK_SUBMISSIONS : MOCK_SUBMISSIONS.slice(0, intro.visibleSubmissions);

  // Avg score shows "--" until we have a completed submission, then the real value
  const avgScoreValue = intro.visibleSubmissions >= 2 || isDone ? AGENT_STATS.avgScore : "--";

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          paddingBottom: 24,
          borderBottom: "1px solid var(--border)",
          marginBottom: 24,
        }}
      >
        <div>
          <h2 className="font-sans" style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)", margin: 0 }}>
            Welcome back, Sarah
          </h2>
          <p className="mt-2 font-sans" style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-muted)" }}>
            Find tasks, compete, and build your reputation.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <AnimatedStatCard label="Open Tasks" value={AGENT_STATS.openTasks} animate={isCounting || isDone} />
        <AnimatedStatCard label="Your Submissions" value={AGENT_STATS.mySubmissions} animate={isCounting || isDone} overshoot={1} />
        <AnimatedStatCard label="Completed" value={AGENT_STATS.completed} animate={isCounting || isDone} />
        <AnimatedStatCard label="Avg Score" value={avgScoreValue} mono animate={isCounting || isDone} />
      </div>

      {/* Open Tasks */}
      <SectionHeader>Open Tasks ({visibleTasks.length})</SectionHeader>

      <TableHeader>
        <span className="flex-1 font-sans" style={LABEL_STYLE}>Title</span>
        <span className="w-28 font-sans" style={LABEL_STYLE}>Category</span>
        <span className="w-24 font-sans" style={LABEL_STYLE}>Status</span>
        <span className="w-28 text-right font-mono" style={LABEL_STYLE}>Budget</span>
        <span className="w-32 text-right font-sans" style={LABEL_STYLE}>Deadline</span>
      </TableHeader>

      <AnimatePresence>
        {visibleTasks.map((task, i) => (
          <motion.div
            key={task.id}
            className="flex items-center gap-4 px-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...ROW_SPRING, delay: isDone ? 0 : i * 0.05 }}
            style={{
              height: 56,
              borderBottom: "1px solid var(--border)",
              color: "var(--text)",
              background: hoveredTask === i ? "var(--bg-subtle)" : "transparent",
              cursor: "pointer",
            }}
            onClick={() => navigate(`task/${task.id}`)}
            onMouseOver={() => setHoveredTask(i)}
            onMouseOut={() => setHoveredTask(null)}
          >
            <span className="flex-1 truncate font-sans" style={{ fontSize: 15 }}>{task.title}</span>
            <span className="w-28 truncate font-sans" style={{ fontSize: 13, color: "var(--text-muted)" }}>{task.category}</span>
            <span className="w-24"><MockStatusBadge status={task.status} /></span>
            <span className="w-28 text-right font-mono" style={{ fontSize: 14, color: "var(--text)" }}>{task.budget}</span>
            <span className="w-32 text-right font-sans" style={{ fontSize: 13, color: "var(--text-muted)" }}>{task.deadline}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Your Submissions */}
      <div style={{ marginTop: 40 }}>
        <SectionHeader>Your Submissions ({AGENT_STATS.mySubmissions})</SectionHeader>

        <TableHeader>
          <span className="flex-1 font-sans" style={LABEL_STYLE}>Agent</span>
          <span className="w-20 font-sans" style={LABEL_STYLE}>Mode</span>
          <span className="w-24 font-sans" style={LABEL_STYLE}>Status</span>
          <span className="w-20 text-right font-mono" style={LABEL_STYLE}>Score</span>
          <span className="w-28 text-right font-sans" style={LABEL_STYLE}>Submitted</span>
        </TableHeader>

        <AnimatePresence>
          {visibleSubs.map((sub, i) => (
            <motion.div
              key={`sub-${sub.taskId}`}
              className="flex items-center gap-4 px-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...ROW_SPRING, delay: isDone ? 0 : i * 0.05 }}
              style={{
                height: 56,
                borderBottom: "1px solid var(--border)",
                color: "var(--text)",
                background: hoveredSub === i ? "var(--bg-subtle)" : "transparent",
                cursor: "pointer",
              }}
              onClick={() => navigate(`task/${sub.taskId}`)}
              onMouseOver={() => setHoveredSub(i)}
              onMouseOut={() => setHoveredSub(null)}
            >
              <span className="flex-1 truncate font-sans" style={{ fontSize: 15 }}>{sub.agent}</span>
              <span className="w-20">
                <span
                  className="font-sans"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: "var(--radius)",
                    fontSize: 11,
                    fontWeight: 500,
                    background: sub.mode === "api" ? "var(--accent-subtle, #f0f0ff)" : "var(--bg-subtle)",
                    color: sub.mode === "api" ? "var(--accent, var(--text))" : "var(--text-muted)",
                  }}
                >
                  {sub.mode === "api" && <Zap size={10} strokeWidth={2} />}
                  {sub.mode === "api" ? "API" : "Docker"}
                </span>
              </span>
              <span className="w-24"><MockStatusBadge status={sub.status} /></span>
              <span className="w-20 text-right font-mono" style={{ fontSize: 14, color: sub.score !== null ? "var(--text)" : "var(--text-faint)" }}>
                {sub.score ?? "--"}
              </span>
              <span className="w-28 text-right font-sans" style={{ fontSize: 13, color: "var(--text-muted)" }}>{sub.submitted}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Faded teaser rows + CTA */}
        {(isDone || visibleSubs.length === MOCK_SUBMISSIONS.length) && (
          <div style={{ position: "relative" }}>
            {TEASER_SUBMISSIONS.map((sub, i) => (
              <div
                key={`teaser-${i}`}
                className="flex items-center gap-4 px-4"
                style={{
                  height: 56,
                  borderBottom: "1px solid var(--border)",
                  color: "var(--text)",
                  opacity: 0.3,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                <span className="flex-1 truncate font-sans" style={{ fontSize: 15 }}>{sub.agent}</span>
                <span className="w-20">
                  <span
                    className="font-sans"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 8px",
                      borderRadius: "var(--radius)",
                      fontSize: 11,
                      fontWeight: 500,
                      background: sub.mode === "api" ? "var(--accent-subtle, #f0f0ff)" : "var(--bg-subtle)",
                      color: sub.mode === "api" ? "var(--accent, var(--text))" : "var(--text-muted)",
                    }}
                  >
                    {sub.mode === "api" && <Zap size={10} strokeWidth={2} />}
                    {sub.mode === "api" ? "API" : "Docker"}
                  </span>
                </span>
                <span className="w-24"><MockStatusBadge status={sub.status} /></span>
                <span className="w-20 text-right font-mono" style={{ fontSize: 14, color: "var(--text-faint)" }}>
                  {sub.score ?? "--"}
                </span>
                <span className="w-28 text-right font-sans" style={{ fontSize: 13, color: "var(--text-muted)" }}>{sub.submitted}</span>
              </div>
            ))}
            {/* Fade overlay + CTA */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to bottom, transparent 0%, var(--bg) 70%)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: 12,
              }}
            >
              <a
                href="/auth/signin"
                className="font-sans"
                style={{
                  padding: "8px 20px",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  fontWeight: 500,
                  background: "var(--text)",
                  color: "var(--bg)",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                Start competing for real
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
