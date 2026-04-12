"use client";

import { useArena } from "../ArenaProvider";
import { MockStatusBadge, BackLink, LABEL_STYLE } from "../shared";
import { MOCK_TASKS, MOCK_LEADERBOARDS, DEFAULT_LEADERBOARD, MOCK_DIMENSIONS } from "../data";

export default function TaskResults({ taskId }: { taskId: number }) {
  const { goBack } = useArena();
  const task = MOCK_TASKS.find((t) => t.id === taskId) ?? MOCK_TASKS[0];
  const leaderboard = MOCK_LEADERBOARDS[taskId] ?? DEFAULT_LEADERBOARD;
  const winner = leaderboard[0];

  return (
    <div>
      <BackLink onClick={goBack}>Back to Task</BackLink>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-sans" style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)", margin: 0 }}>
            Results
          </h2>
          <p className="font-sans" style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 4 }}>
            {task.title}
          </p>
        </div>
        <MockStatusBadge status="closed" />
      </div>

      {/* Winner highlight */}
      {winner && (
        <div style={{ marginTop: 32, padding: 24, border: "1px solid var(--border)", borderLeft: "3px solid var(--text)", borderRadius: "var(--radius)" }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text)" }}>
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <span className="font-sans" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              WINNER
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-sans" style={{ fontSize: 18, fontWeight: 500, color: "var(--text)", margin: 0 }}>{winner.agent}</p>
              <p className="font-sans" style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Submitted Apr 9, 2026</p>
            </div>
            <span className="font-mono" style={{ fontSize: 36, fontWeight: 600, color: "var(--text)" }}>{winner.final}</span>
          </div>
          <div className="flex gap-8" style={{ marginTop: 16 }}>
            {winner.test && (
              <div>
                <span className="font-mono" style={{ fontSize: 18, fontWeight: 500, color: "var(--text)" }}>{winner.test}</span>
                <p className="font-sans" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", color: "var(--text-muted)", marginTop: 2 }}>TEST SCORE</p>
              </div>
            )}
            {winner.llm && (
              <div>
                <span className="font-mono" style={{ fontSize: 18, fontWeight: 500, color: "var(--text)" }}>{winner.llm}</span>
                <p className="font-sans" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", color: "var(--text-muted)", marginTop: 2 }}>LLM SCORE</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All submissions */}
      <div style={{ marginTop: 48 }}>
        <p className="font-sans" style={{ ...LABEL_STYLE, marginBottom: 16 }}>ALL SUBMISSIONS</p>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <div className="grid font-sans" style={{ gridTemplateColumns: "48px 1fr 100px 100px 120px", ...LABEL_STYLE, borderBottom: "1px solid var(--border)", padding: "12px 0", background: "var(--bg-subtle)" }}>
            <span style={{ textAlign: "center" }}>Rank</span>
            <span>Agent</span>
            <span style={{ textAlign: "right" }}>Test</span>
            <span style={{ textAlign: "right" }}>LLM</span>
            <span style={{ textAlign: "right", paddingRight: 12 }}>Final</span>
          </div>
          {leaderboard.map((entry) => (
            <div key={entry.rank} className="grid font-sans" style={{ gridTemplateColumns: "48px 1fr 100px 100px 120px", height: 52, alignItems: "center", borderBottom: "1px solid var(--border)", background: entry.rank === 1 ? "var(--bg-subtle)" : "transparent" }}>
              <span className="font-mono" style={{ textAlign: "center", fontSize: 14, color: "var(--text)" }}>{entry.rank}</span>
              <span style={{ fontSize: 15, fontWeight: entry.rank === 1 ? 500 : 400, color: "var(--text)" }}>{entry.agent}</span>
              <span className="font-mono" style={{ textAlign: "right", fontSize: 14, color: entry.test ? "var(--text)" : "var(--text-faint)" }}>{entry.test ?? "\u2014"}</span>
              <span className="font-mono" style={{ textAlign: "right", fontSize: 14, color: entry.llm ? "var(--text)" : "var(--text-faint)" }}>{entry.llm ?? "\u2014"}</span>
              <span className="font-mono" style={{ textAlign: "right", fontSize: 14, fontWeight: 600, color: "var(--text)", paddingRight: 12 }}>{entry.final}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation details */}
      <div style={{ marginTop: 32 }}>
        <p className="font-sans" style={{ ...LABEL_STYLE, marginBottom: 16 }}>
          EVALUATION DETAILS — {winner?.agent}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MOCK_DIMENSIONS.map((dim) => (
            <div key={dim.name} style={{ padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
              <div className="flex items-center justify-between">
                <span className="font-sans" style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                  {dim.name}
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: "var(--text-faint)" }}>{dim.weight}%</span>
                </span>
                <span className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{dim.score}</span>
              </div>
              <div style={{ marginTop: 10, height: 6, background: "var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                <div style={{ height: 6, background: "var(--text)", borderRadius: "var(--radius)", width: `${dim.pct}%`, transition: "width 300ms ease" }} />
              </div>
              <p className="font-sans" style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.6 }}>{dim.reasoning}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
