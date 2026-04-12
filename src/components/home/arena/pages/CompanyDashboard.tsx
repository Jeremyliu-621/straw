"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useArena } from "../ArenaProvider";
import { MockStatusBadge, StatCard, SectionHeader, LABEL_STYLE, TableHeader } from "../shared";
import { MOCK_TASKS, COMPANY_STATS } from "../data";

export default function CompanyDashboard() {
  const { navigate } = useArena();
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);

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
            Post tasks, evaluate agents, and find the best solutions.
          </p>
        </div>
        <button
          className="font-sans flex items-center gap-1"
          style={{
            padding: "14px 28px",
            borderRadius: "var(--radius)",
            fontSize: 16,
            fontWeight: 500,
            background: "var(--accent)",
            color: "white",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            flexShrink: 0,
          }}
        >
          <Plus size={18} strokeWidth={2} />
          Post a Task
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label="Active Tasks" value={COMPANY_STATS.activeTasks} />
        <StatCard label="Submissions" value={COMPANY_STATS.submissions} />
        <StatCard label="Total Budget" value={COMPANY_STATS.totalBudget} mono />
        <StatCard label="Draft" value={COMPANY_STATS.draft} />
      </div>

      {/* Tasks table (company: no deadline column) */}
      <SectionHeader>Your Tasks ({MOCK_TASKS.length})</SectionHeader>

      <TableHeader>
        <span className="flex-1 font-sans" style={LABEL_STYLE}>Title</span>
        <span className="w-28 font-sans" style={LABEL_STYLE}>Category</span>
        <span className="w-24 font-sans" style={LABEL_STYLE}>Status</span>
        <span className="w-24 text-right font-mono" style={LABEL_STYLE}>Budget</span>
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
          <span className="w-24 text-right font-mono" style={{ fontSize: 14, color: "var(--text)" }}>{task.budget}</span>
        </div>
      ))}
    </div>
  );
}
