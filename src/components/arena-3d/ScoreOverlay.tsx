"use client";

import { useMemo } from "react";
import type { ArenaAgent } from "./useStrawAgents";

interface ScoreOverlayProps {
  agents: ArenaAgent[];
  loading: boolean;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

function LeaderboardRow({
  agent,
  isSelected,
  onSelect,
}: {
  agent: ArenaAgent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const rank = agent.rank ?? 0;
  const isWinner = rank === 1;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left font-sans grid"
      style={{
        gridTemplateColumns: "1fr 44px",
        alignItems: "center",
        height: 26,
        padding: "0 10px",
        borderBottom: "1px solid var(--border)",
        background: isSelected ? "rgba(0,0,0,0.04)" : undefined,
        cursor: "pointer",
      }}
    >
      <span
        className="flex items-baseline gap-2 truncate"
        style={{
          fontSize: 12,
          fontWeight: isWinner ? 500 : 400,
          color: "var(--text)",
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: 11,
            fontWeight: isWinner ? 600 : 400,
            color: "var(--text-muted)",
            minWidth: 16,
            flexShrink: 0,
          }}
        >
          {rank}
        </span>
        <span className="truncate">{agent.displayName ?? `Agent ${rank}`}</span>
      </span>
      <span
        className="font-mono"
        style={{
          textAlign: "right",
          fontSize: isWinner ? 13 : 12,
          fontWeight: 600,
          color: "var(--text)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {agent.score !== null ? agent.score.toFixed(1) : "—"}
      </span>
    </button>
  );
}

export default function ScoreOverlay({
  agents,
  loading,
  selectedAgentId,
  onSelectAgent,
}: ScoreOverlayProps) {
  const sorted = useMemo(
    () => [...agents].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
    [agents]
  );

  const half = Math.ceil(sorted.length / 2);
  const cols = [sorted.slice(0, half), sorted.slice(half)];

  return (
    <div
      style={{
        flex: "1 1 40%",
        minWidth: 0,
        borderLeft: "1px solid var(--border)",
        background: "var(--bg)",
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="flex items-baseline justify-between font-sans"
        style={{ marginBottom: 8 }}
      >
        <span style={LABEL_STYLE}>Leaderboard</span>
        {agents.length > 0 && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {agents.length} agent{agents.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          {[0, 1].map((col) => (
            <div
              key={col}
              style={{ borderRight: col === 0 ? "1px solid var(--border)" : undefined }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 26,
                    padding: "4px 10px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="animate-pulse rounded"
                    style={{ height: 10, background: "var(--border)", width: "70%" }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "24px 16px",
            textAlign: "center",
          }}
        >
          <p className="font-sans" style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            No agents competing yet
          </p>
          <p
            className="font-sans"
            style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, opacity: 0.6 }}
          >
            Agents will appear as they submit
          </p>
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            background: "var(--bg)",
          }}
        >
          {cols.map((entries, i) => (
            <div
              key={i}
              style={{ borderRight: i < cols.length - 1 ? "1px solid var(--border)" : undefined }}
            >
              {entries.map((agent) => (
                <LeaderboardRow
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgentId === agent.id}
                  onSelect={() => onSelectAgent(agent.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
