"use client";

import { useState } from "react";
import type { ArenaAgent } from "./useStrawAgents";

interface ScoreOverlayProps {
  agents: ArenaAgent[];
  loading: boolean;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
}

function formatScore(score: number | null): string {
  if (score === null) return "--";
  return score.toFixed(1);
}

function statusLabel(status: string | null): { text: string; color: string } {
  switch (status) {
    case "running":
      return { text: "Running", color: "#d97706" };
    case "pending":
      return { text: "Queued", color: "#6366f1" };
    case "completed":
      return { text: "Done", color: "#16a34a" };
    case "failed":
    case "evaluation_failed":
      return { text: "Failed", color: "#dc2626" };
    case "registered":
      return { text: "Registered", color: "#64748b" };
    default:
      return { text: "Idle", color: "#94a3b8" };
  }
}

export default function ScoreOverlay({
  agents,
  loading,
  selectedAgentId,
  onSelectAgent,
}: ScoreOverlayProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="flex flex-col border-l border-gray-200 bg-white/95 backdrop-blur-sm"
      style={{ width: collapsed ? 48 : 300, transition: "width 200ms ease" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        {!collapsed && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Live Rankings
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-black transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M15 18l-6-6 6-6" />
            )}
          </svg>
        </button>
      </div>

      {collapsed ? null : (
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500">No agents competing yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Agents will appear here as they submit
              </p>
            </div>
          ) : (
            <div>
              {agents.map((agent, idx) => {
                const { text: statusText, color: statusColor } = statusLabel(agent.latestStatus);
                const isSelected = selectedAgentId === agent.id;

                return (
                  <button
                    key={agent.id}
                    onClick={() => onSelectAgent(isSelected ? null : agent.id)}
                    className="w-full text-left px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50/80 transition-colors"
                    style={{
                      background: isSelected ? "rgba(99, 102, 241, 0.05)" : undefined,
                      borderLeft: isSelected ? "2px solid #6366f1" : "2px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="font-mono text-xs text-gray-400 w-5 text-right"
                        style={{ fontWeight: idx === 0 ? 600 : 400 }}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] font-medium text-gray-900 truncate"
                          style={{
                            fontWeight: idx === 0 ? 600 : 500,
                            color: agent.displayName === null ? "#94a3b8" : undefined,
                            fontStyle: agent.displayName === null ? "italic" : undefined,
                          }}
                        >
                          {agent.displayName ?? "Awaiting submission"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[10px] font-medium uppercase tracking-wider"
                            style={{ color: statusColor }}
                          >
                            {statusText}
                          </span>
                          <span className="text-[10px] text-gray-300">|</span>
                          <span className="text-[10px] text-gray-400 truncate">
                            {agent.taskTitle}
                          </span>
                        </div>
                      </div>
                      <span
                        className="font-mono text-sm tabular-nums"
                        style={{
                          fontWeight: idx < 3 ? 600 : 400,
                          color: agent.score !== null ? "#111" : "#94a3b8",
                        }}
                      >
                        {formatScore(agent.score)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
