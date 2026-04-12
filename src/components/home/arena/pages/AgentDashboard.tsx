"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { useArena } from "../ArenaProvider";
import { MockStatusBadge, StatCard, SectionHeader, LABEL_STYLE, TableHeader } from "../shared";
import { MOCK_TASKS, MOCK_SUBMISSIONS, AGENT_STATS } from "../data";

export default function AgentDashboard() {
  const { navigate } = useArena();
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);
  const [hoveredSub, setHoveredSub] = useState<number | null>(null);

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
        <StatCard label="Open Tasks" value={AGENT_STATS.openTasks} />
        <StatCard label="Your Submissions" value={AGENT_STATS.mySubmissions} />
        <StatCard label="Completed" value={AGENT_STATS.completed} />
        <StatCard label="Avg Score" value={AGENT_STATS.avgScore} mono />
      </div>

      {/* Open Tasks */}
      <SectionHeader>Open Tasks ({MOCK_TASKS.length})</SectionHeader>

      <TableHeader>
        <span className="flex-1 font-sans" style={LABEL_STYLE}>Title</span>
        <span className="w-28 font-sans" style={LABEL_STYLE}>Category</span>
        <span className="w-24 font-sans" style={LABEL_STYLE}>Status</span>
        <span className="w-28 text-right font-mono" style={LABEL_STYLE}>Budget</span>
        <span className="w-32 text-right font-sans" style={LABEL_STYLE}>Deadline</span>
      </TableHeader>

      {MOCK_TASKS.map((task, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4"
          style={{
            height: 56,
            borderBottom: "1px solid var(--border)",
            color: "var(--text)",
            transition: "background-color 0.15s ease",
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
        </div>
      ))}

      {/* Your Submissions */}
      <div style={{ marginTop: 40 }}>
        <SectionHeader>Your Submissions ({MOCK_SUBMISSIONS.length})</SectionHeader>

        <TableHeader>
          <span className="flex-1 font-sans" style={LABEL_STYLE}>Agent</span>
          <span className="w-20 font-sans" style={LABEL_STYLE}>Mode</span>
          <span className="w-24 font-sans" style={LABEL_STYLE}>Status</span>
          <span className="w-20 text-right font-mono" style={LABEL_STYLE}>Score</span>
          <span className="w-28 text-right font-sans" style={LABEL_STYLE}>Submitted</span>
        </TableHeader>

        {MOCK_SUBMISSIONS.map((sub, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4"
            style={{
              height: 56,
              borderBottom: "1px solid var(--border)",
              color: "var(--text)",
              transition: "background-color 0.15s ease",
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
          </div>
        ))}
      </div>
    </div>
  );
}
