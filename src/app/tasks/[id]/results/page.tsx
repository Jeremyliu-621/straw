"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(
    null
  );
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
              style={{
                height: "24px",
                background: "var(--bg-subtle)",
                borderRadius: "6px",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const winner = results.entries[0] ?? null;

  return (
    <div className="mx-auto max-w-3xl" style={{ padding: "32px" }}>
      {/* Back link */}
      <Link
        href={`/tasks/${id}`}
        className="font-sans inline-flex items-center gap-1 transition-colors"
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          textDecoration: "none",
          marginBottom: "24px",
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
        onMouseOut={(e) =>
          (e.currentTarget.style.color = "var(--text-muted)")
        }
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to Task
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="font-sans"
            style={{
              fontSize: "28px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            Results
          </h1>
          <p
            className="font-sans"
            style={{
              fontSize: "15px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
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
            borderLeft: "3px solid var(--accent, var(--text))",
            borderRadius: "12px",
          }}
        >
          <div className="flex items-center gap-2" style={{ marginBottom: "16px" }}>
            {/* Trophy icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--accent, var(--text))" }}
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <p
              className="font-sans"
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--accent-muted, var(--text-muted))",
              }}
            >
              WINNER
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p
                className="font-sans"
                style={{
                  fontSize: "18px",
                  fontWeight: 500,
                  color: "var(--text)",
                }}
              >
                {winner.agentName}
              </p>
              <p
                className="font-sans"
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                }}
              >
                Submitted{" "}
                {new Date(winner.submittedAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className="font-mono"
              style={{
                fontSize: "36px",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {formatScore(winner.finalScore)}
            </span>
          </div>

          {/* Score breakdown */}
          <div className="flex gap-8" style={{ marginTop: "16px" }}>
            {winner.testScore !== null && (
              <ScoreChip label="TEST SCORE" score={winner.testScore} />
            )}
            {winner.llmScore !== null && (
              <ScoreChip label="LLM SCORE" score={winner.llmScore} />
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

          <div
            style={{
              borderTop: "1px solid var(--border)",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
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
                background: "var(--bg-subtle)",
              }}
            >
              <span style={{ textAlign: "center" }}>Rank</span>
              <span>Agent</span>
              <span style={{ textAlign: "right" }}>Test</span>
              <span style={{ textAlign: "right" }}>LLM</span>
              <span style={{ textAlign: "right", paddingRight: "12px" }}>
                Final
              </span>
            </div>

            {results.entries.map((entry) => {
              const isSelected =
                selectedEntry?.submissionId === entry.submissionId;
              return (
                <button
                  key={entry.submissionId}
                  onClick={() => setSelectedEntry(entry)}
                  className="grid w-full text-left font-sans"
                  style={{
                    gridTemplateColumns: "48px 1fr 100px 100px 120px",
                    height: "52px",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                    background: isSelected
                      ? "var(--accent-subtle, var(--bg-subtle))"
                      : "transparent",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = "var(--bg-subtle)";
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    className="font-mono"
                    style={{
                      textAlign: "center",
                      fontSize: "14px",
                      color: "var(--text)",
                    }}
                  >
                    {entry.rank}
                  </span>
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: entry.rank === 1 ? 500 : 400,
                      color: "var(--text)",
                    }}
                  >
                    {entry.agentName}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      textAlign: "right",
                      fontSize: "14px",
                      color:
                        entry.testScore !== null
                          ? "var(--text)"
                          : "var(--text-faint)",
                    }}
                  >
                    {entry.testScore !== null
                      ? formatScore(entry.testScore)
                      : "\u2014"}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      textAlign: "right",
                      fontSize: "14px",
                      color:
                        entry.llmScore !== null
                          ? "var(--text)"
                          : "var(--text-faint)",
                    }}
                  >
                    {entry.llmScore !== null
                      ? formatScore(entry.llmScore)
                      : "\u2014"}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      textAlign: "right",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text)",
                      paddingRight: "12px",
                    }}
                  >
                    {formatScore(entry.finalScore)}
                  </span>
                </button>
              );
            })}
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

          <div className="space-y-3">
            {dimensions.map((dim) => (
              <div
                key={dim.criterion_name}
                style={{
                  padding: "16px",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-sans"
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "var(--text)",
                    }}
                  >
                    {dim.criterion_name}
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "11px",
                        fontWeight: 400,
                        color: "var(--text-faint)",
                      }}
                    >
                      {dim.weight}%
                    </span>
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {formatScore(dim.score)}
                  </span>
                </div>
                {/* Score bar */}
                <div
                  style={{
                    marginTop: "10px",
                    height: "6px",
                    background: "var(--border)",
                    borderRadius: "3px",
                  }}
                >
                  <div
                    style={{
                      height: "6px",
                      background: "var(--accent, var(--text))",
                      width: `${Math.min(dim.score, 100)}%`,
                      borderRadius: "3px",
                      transition: "width 300ms ease",
                    }}
                  />
                </div>
                {dim.reasoning && (
                  <p
                    className="font-sans"
                    style={{
                      fontSize: "13px",
                      color: "var(--text-muted)",
                      marginTop: "10px",
                      lineHeight: 1.6,
                    }}
                  >
                    {dim.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact winner */}
      {isCompany && results.isOwner && results.revealed && winner && (
        <div
          style={{
            marginTop: "48px",
            padding: "24px",
            border: "1px solid var(--border)",
            borderRadius: "12px",
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
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "var(--accent-subtle, #f0fdf4)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--accent, #16a34a)" }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p
                className="font-sans"
                style={{ fontSize: "15px", color: "var(--text)" }}
              >
                Message sent. Check your inbox for replies.
              </p>
            </div>
          ) : (
            <>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Introduce yourself and explain what you'd like to discuss..."
                className="font-sans w-full resize-none"
                style={{
                  border: "1px solid var(--border)",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "var(--text)",
                  background: "var(--bg)",
                  minHeight: "100px",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--accent, var(--text))";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              />
              <button
                onClick={contactWinner}
                disabled={contactLoading || !contactMessage.trim()}
                className="font-sans mt-3 transition-colors disabled:opacity-40"
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: "var(--accent, var(--text))",
                  color: "white",
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

function ScoreChip({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <span
        className="font-mono"
        style={{
          fontSize: "18px",
          fontWeight: 500,
          color: "var(--text)",
        }}
      >
        {formatScore(score)}
      </span>
      <p
        className="font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.04em",
          color: "var(--text-muted)",
          marginTop: "2px",
        }}
      >
        {label}
      </p>
    </div>
  );
}
