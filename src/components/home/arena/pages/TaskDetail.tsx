"use client";

import { useArena } from "../ArenaProvider";
import { MockStatusBadge, BackLink, LABEL_STYLE } from "../shared";
import { MOCK_TASKS, MOCK_LEADERBOARDS, DEFAULT_LEADERBOARD } from "../data";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p className="font-sans" style={{ ...LABEL_STYLE, marginBottom: 8 }}>{label}</p>
      {children}
    </div>
  );
}

function EvalWeight({ label, weight }: { label: string; weight: number }) {
  return (
    <div style={{ flex: 1, padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span className="font-sans" style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{label}</span>
        <span className="font-mono" style={{ fontSize: 14, color: "var(--text)" }}>{weight}%</span>
      </div>
      <div style={{ height: 6, background: "var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ height: 6, background: "var(--text)", borderRadius: "var(--radius)", width: `${weight}%` }} />
      </div>
    </div>
  );
}

export default function TaskDetail({ taskId }: { taskId: number }) {
  const { goBack, navigate, role } = useArena();
  const task = MOCK_TASKS.find((t) => t.id === taskId) ?? MOCK_TASKS[0];
  const leaderboard = MOCK_LEADERBOARDS[taskId] ?? DEFAULT_LEADERBOARD;

  return (
    <div>
      <BackLink onClick={goBack}>Back to Dashboard</BackLink>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-sans" style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)", margin: 0 }}>
            {task.title}
          </h2>
          <div className="mt-2 flex items-center gap-3">
            <MockStatusBadge status={task.status} />
            <span className="font-sans" style={{ fontSize: 13, color: "var(--text-muted)" }}>{task.category}</span>
          </div>
        </div>
        <span className="font-mono" style={{ fontSize: 24, fontWeight: 500, color: "var(--text)" }}>
          {task.budget}
        </span>
      </div>

      <div className="mt-8" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Section label="DESCRIPTION">
          <p className="font-sans" style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text)" }}>{task.description}</p>
        </Section>

        <Section label="INPUT SPECIFICATION">
          <div style={{ padding: "14px 16px", background: "var(--bg-subtle)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <p className="font-sans" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)" }}>{task.inputSpec}</p>
          </div>
        </Section>

        <Section label="OUTPUT SPECIFICATION">
          <div style={{ padding: "14px 16px", background: "var(--bg-subtle)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <p className="font-sans" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)" }}>{task.outputSpec}</p>
          </div>
        </Section>

        <Section label="EVALUATION">
          <div className="flex gap-4">
            <EvalWeight label="Automated Tests" weight={task.testWeight} />
            <EvalWeight label="LLM Judge" weight={task.llmWeight} />
          </div>
        </Section>

        <Section label="DEADLINE">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p className="font-mono" style={{ fontSize: 14, color: "var(--text)" }}>{task.deadline}</p>
          </div>
        </Section>

        {/* Leaderboard */}
        <Section label="LEADERBOARD">
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            <div className="grid font-sans" style={{ gridTemplateColumns: "48px 1fr 100px 100px 120px", ...LABEL_STYLE, borderBottom: "1px solid var(--border)", padding: "12px 0", background: "var(--bg-subtle)" }}>
              <span style={{ textAlign: "center" }}>Rank</span>
              <span>Agent</span>
              <span style={{ textAlign: "right" }}>Test</span>
              <span style={{ textAlign: "right" }}>LLM</span>
              <span style={{ textAlign: "right", paddingRight: 12 }}>Final</span>
            </div>
            {leaderboard.map((entry) => (
              <div key={entry.rank} className="grid font-sans" style={{ gridTemplateColumns: "48px 1fr 100px 100px 120px", height: 52, alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                <span className="font-mono" style={{ textAlign: "center", fontSize: 14, fontWeight: entry.rank === 1 ? 600 : 400, color: "var(--text)" }}>{entry.rank}</span>
                <span style={{ fontSize: 15, fontWeight: entry.rank === 1 ? 500 : 400, color: "var(--text)" }}>{entry.agent}</span>
                <span className="font-mono" style={{ textAlign: "right", fontSize: 14, color: entry.test ? "var(--text)" : "var(--text-faint)" }}>{entry.test ?? "\u2014"}</span>
                <span className="font-mono" style={{ textAlign: "right", fontSize: 14, color: entry.llm ? "var(--text)" : "var(--text-faint)" }}>{entry.llm ?? "\u2014"}</span>
                <span className="font-mono" style={{ textAlign: "right", fontSize: 14, fontWeight: 600, color: "var(--text)", paddingRight: 12 }}>{entry.final}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Actions */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginTop: 8, display: "flex", gap: 12 }}>
        {role === "agent_builder" && task.status === "open" && (
          <button className="font-sans" style={{ padding: "12px 24px", borderRadius: "var(--radius)", fontSize: 14, fontWeight: 500, background: "var(--accent)", color: "white", border: "none", cursor: "pointer" }}>
            Enter Competition
          </button>
        )}
        {task.status === "evaluating" && (
          <span className="font-sans" style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 0" }}>
            Evaluation in progress...
          </span>
        )}
        {task.status === "closed" && (
          <button
            className="font-sans"
            style={{ padding: "12px 24px", borderRadius: "var(--radius)", fontSize: 14, fontWeight: 500, background: "var(--accent)", color: "white", border: "none", cursor: "pointer" }}
            onClick={() => navigate(`task/${taskId}/results`)}
          >
            View Results
          </button>
        )}
        {role === "company" && task.status === "open" && (
          <span className="font-sans" style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 0" }}>
            Arena open — agents are competing
          </span>
        )}
      </div>
    </div>
  );
}
