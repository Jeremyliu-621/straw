"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { StatusBadge } from "@/components/status-badge";
import { ROLE_COMPANY } from "@/constants";
import { formatScore, formatCurrency } from "@/services/results.service";

interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  finalScore: number;
  testScore: number | null;
  llmScore: number | null;
  submissionId: string;
  submittedAt: string;
}

interface ResultsData {
  entries: LeaderboardEntry[];
  revealed: boolean;
  deadline: string;
  taskStatus: string;
  isOwner: boolean;
}

interface TaskData {
  id: string;
  title: string;
  status: string;
  budget_cents: number;
  deadline: string;
  company_id: string;
}

interface DimensionDetail {
  criterion_name: string;
  score: number;
  reasoning: string | null;
  weight: number;
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [task, setTask] = useState<TaskData | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const [dimensions, setDimensions] = useState<DimensionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  const isCompany = session?.user?.role === ROLE_COMPANY;

  useEffect(() => {
    if (!id) return;

    Promise.all([
      fetch(`/api/tasks/${id}`).then((r) => r.json()),
      fetch(`/api/tasks/${id}/leaderboard`).then((r) => r.json()),
    ])
      .then(([taskData, resultsData]) => {
        setTask(taskData);
        setResults(resultsData);
        if (resultsData.entries?.length > 0) {
          setSelectedEntry(resultsData.entries[0]);
        }
      })
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Fetch dimension details when an entry is selected
  useEffect(() => {
    if (!selectedEntry) return;

    fetch(`/api/submissions/${selectedEntry.submissionId}/details`)
      .then((r) => {
        if (r.ok) return r.json();
        return { dimensions: [] };
      })
      .then((data) => setDimensions(data.dimensions ?? []))
      .catch(() => setDimensions([]));
  }, [selectedEntry]);

  async function contactWinner() {
    if (!selectedEntry || !contactMessage.trim()) return;
    setContactLoading(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: selectedEntry.agentId,
          taskId: id,
          body: contactMessage,
        }),
      });

      if (res.ok) {
        setContactSent(true);
        setContactMessage("");
      }
    } catch {
      // Error handled silently
    } finally {
      setContactLoading(false);
    }
  }

  if (loading || !task || !results) {
    return (
      <div className="mx-auto max-w-3xl" style={{ padding: "32px" }}>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ height: "24px", background: "var(--bg-subtle)", borderRadius: "6px" }}
            />
          ))}
        </div>
      </div>
    );
  }

  const winner = results.entries[0] ?? null;

  return (
    <div className="mx-auto max-w-3xl" style={{ padding: "32px" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="font-sans"
            style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
          >
            Results
          </h1>
          <p className="font-sans" style={{ fontSize: "15px", color: "var(--text-muted)", marginTop: "4px" }}>
            {task.title}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {/* Winner highlight */}
      {winner && (
        <div
          style={{
            marginTop: "32px",
            padding: "24px",
            border: "1px solid var(--border)",
            borderRadius: "6px",
          }}
        >
          <p
            className="font-sans"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: "12px",
            }}
          >
            WINNER
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-sans" style={{ fontSize: "18px", fontWeight: 500, color: "var(--text)" }}>
                {winner.agentName}
              </p>
              <p className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                Submitted {new Date(winner.submittedAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className="font-mono"
              style={{ fontSize: "48px", fontWeight: 600, color: "var(--text)" }}
            >
              {formatScore(winner.finalScore)}
            </span>
          </div>

          {/* Score breakdown */}
          <div className="flex gap-8" style={{ marginTop: "16px" }}>
            {winner.testScore !== null && (
              <div>
                <span className="font-mono" style={{ fontSize: "18px", fontWeight: 500, color: "var(--text)" }}>
                  {formatScore(winner.testScore)}
                </span>
                <p className="font-sans" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  TEST SCORE
                </p>
              </div>
            )}
            {winner.llmScore !== null && (
              <div>
                <span className="font-mono" style={{ fontSize: "18px", fontWeight: 500, color: "var(--text)" }}>
                  {formatScore(winner.llmScore)}
                </span>
                <p className="font-sans" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  LLM SCORE
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full leaderboard */}
      {results.entries.length > 0 && (
        <div style={{ marginTop: "48px" }}>
          <p
            className="font-sans"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: "16px",
            }}
          >
            ALL SUBMISSIONS
          </p>

          <div style={{ borderTop: "1px solid var(--border)" }}>
            {/* Header */}
            <div
              className="grid font-sans"
              style={{
                gridTemplateColumns: "48px 1fr 100px 100px 120px",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--text-muted)",
                borderBottom: "1px solid var(--border)",
                padding: "12px 0",
              }}
            >
              <span style={{ textAlign: "center" }}>Rank</span>
              <span>Agent</span>
              <span style={{ textAlign: "right" }}>Test</span>
              <span style={{ textAlign: "right" }}>LLM</span>
              <span style={{ textAlign: "right" }}>Final</span>
            </div>

            {results.entries.map((entry) => (
              <button
                key={entry.submissionId}
                onClick={() => setSelectedEntry(entry)}
                className="grid w-full text-left font-sans"
                style={{
                  gridTemplateColumns: "48px 1fr 100px 100px 120px",
                  height: "48px",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border)",
                  background:
                    selectedEntry?.submissionId === entry.submissionId
                      ? "var(--bg-subtle)"
                      : "transparent",
                  cursor: "pointer",
                  transition: "background 150ms",
                }}
              >
                <span className="font-mono" style={{ textAlign: "center", fontSize: "14px", color: "var(--text)" }}>
                  {entry.rank}
                </span>
                <span style={{ fontSize: "15px", fontWeight: entry.rank === 1 ? 500 : 400, color: "var(--text)" }}>
                  {entry.agentName}
                </span>
                <span
                  className="font-mono"
                  style={{
                    textAlign: "right",
                    fontSize: "14px",
                    color: entry.testScore !== null ? "var(--text)" : "var(--text-faint)",
                  }}
                >
                  {entry.testScore !== null ? formatScore(entry.testScore) : "—"}
                </span>
                <span
                  className="font-mono"
                  style={{
                    textAlign: "right",
                    fontSize: "14px",
                    color: entry.llmScore !== null ? "var(--text)" : "var(--text-faint)",
                  }}
                >
                  {entry.llmScore !== null ? formatScore(entry.llmScore) : "—"}
                </span>
                <span className="font-mono" style={{ textAlign: "right", fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                  {formatScore(entry.finalScore)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dimension breakdown for selected entry */}
      {selectedEntry && dimensions.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <p
            className="font-sans"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: "16px",
            }}
          >
            EVALUATION DETAILS — {selectedEntry.agentName}
          </p>

          <div className="space-y-4">
            {dimensions.map((dim) => (
              <div
                key={dim.criterion_name}
                style={{
                  padding: "16px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-sans" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                    {dim.criterion_name}
                    <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--text-faint)" }}>
                      {dim.weight}%
                    </span>
                  </span>
                  <span className="font-mono" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                    {formatScore(dim.score)}
                  </span>
                </div>
                {/* Score bar */}
                <div style={{ marginTop: "8px", height: "4px", background: "var(--border)" }}>
                  <div
                    style={{
                      height: "4px",
                      background: "var(--text)",
                      width: `${Math.min(dim.score, 100)}%`,
                    }}
                  />
                </div>
                {dim.reasoning && (
                  <p
                    className="font-sans"
                    style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px", lineHeight: 1.6 }}
                  >
                    {dim.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact winner — company only, closed tasks, when identities revealed */}
      {isCompany && results.isOwner && results.revealed && winner && (
        <div
          style={{
            marginTop: "48px",
            padding: "24px",
            border: "1px solid var(--border)",
            borderRadius: "6px",
          }}
        >
          <p
            className="font-sans"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: "12px",
            }}
          >
            CONTACT WINNER
          </p>

          {contactSent ? (
            <p className="font-sans" style={{ fontSize: "15px", color: "var(--success)" }}>
              Message sent. Check your inbox for replies.
            </p>
          ) : (
            <>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Introduce yourself and explain what you'd like to discuss..."
                className="font-sans w-full resize-none"
                style={{
                  border: "1px solid var(--border)",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  fontSize: "15px",
                  color: "var(--text)",
                  background: "var(--bg)",
                  minHeight: "100px",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "2px solid var(--text)";
                  e.currentTarget.style.outlineOffset = "2px";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = "none";
                }}
              />
              <button
                onClick={contactWinner}
                disabled={contactLoading || !contactMessage.trim()}
                className="font-sans mt-3 transition-colors disabled:opacity-40"
                style={{
                  padding: "10px 16px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: "var(--text)",
                  color: "var(--inverse-text)",
                }}
              >
                {contactLoading ? "Sending..." : "Send Message"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
