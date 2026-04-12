"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { StatusBadge } from "@/components/status-badge";
import { Leaderboard } from "@/components/leaderboard";
import { DeadlineCountdown } from "@/components/deadline-countdown";
import { ROLE_COMPANY, ROLE_AGENT_BUILDER, EVAL_MODE } from "@/constants";
import type { EvalMode } from "@/constants";

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  input_spec: string;
  output_spec: string;
  test_weight: number;
  llm_weight: number;
  budget_cents: number;
  deadline: string;
  status: string;
  company_id: string;
  eval_mode: EvalMode;
  eval_image: string | null;
}

interface Submission {
  id: string;
  status: string;
  created_at: string;
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompany = session?.user?.role === ROLE_COMPANY;
  const isAgent = session?.user?.role === ROLE_AGENT_BUILDER;
  const isOwner = isCompany && task?.company_id === session?.user?.supabaseId;

  const handleDeadlineExpired = useCallback(() => {
    fetch(`/api/tasks/${id}/close`, { method: "POST" }).catch(() => {});
    setTask((prev) => (prev ? { ...prev, status: "evaluating" } : prev));
  }, [id]);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/tasks/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setTask(data))
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));

    if (isAgent) {
      fetch(`/api/submissions?task_id=${id}`)
        .then((res) => res.json())
        .then((data) => {
          // API returns an array of submissions for this agent+task (ordered by created_at desc)
          if (Array.isArray(data) && data.length > 0) {
            setSubmission(data[0]); // Most recent submission
          }
        })
        .catch(() => {});
    }
  }, [id, isAgent, router]);

  async function publishTask() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "open" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to publish");
        return;
      }
      setTask((prev) => (prev ? { ...prev, status: "open" } : prev));
    } catch {
      setError("Network error");
    } finally {
      setPublishing(false);
    }
  }

  if (loading || !task) {
    return (
      <div className="mx-auto max-w-2xl" style={{ padding: "32px" }}>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: "24px",
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl" style={{ padding: "32px" }}>
      {/* Back link */}
      <Link
        href="/dashboard"
        className="font-sans inline-flex items-center gap-1 transition-colors"
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          textDecoration: "none",
          marginBottom: "24px",
        }}
        onMouseOver={(e) =>
          (e.currentTarget.style.color = "var(--text)")
        }
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
        Back to Dashboard
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
            {task.title}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={task.status} />
            <span
              className="font-sans"
              style={{ fontSize: "13px", color: "var(--text-muted)" }}
            >
              {task.category}
            </span>
          </div>
        </div>
        <span
          className="font-mono"
          style={{
            fontSize: "24px",
            fontWeight: 500,
            color: "var(--text)",
          }}
        >
          ${(task.budget_cents / 100).toLocaleString()}
        </span>
      </div>

      <div className="mt-8 space-y-6">
        <Section label="DESCRIPTION">
          <p
            className="font-sans"
            style={{
              fontSize: "15px",
              lineHeight: 1.6,
              color: "var(--text)",
            }}
          >
            {task.description}
          </p>
        </Section>

        <Section label="INPUT SPECIFICATION">
          <div
            style={{
              padding: "14px 16px",
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="font-sans"
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "var(--text)",
              }}
            >
              {task.input_spec}
            </p>
          </div>
        </Section>

        <Section label="OUTPUT SPECIFICATION">
          <div
            style={{
              padding: "14px 16px",
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="font-sans"
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "var(--text)",
              }}
            >
              {task.output_spec}
            </p>
          </div>
        </Section>

        <Section label="EVALUATION">
          <div className="flex gap-4 mb-3">
            <EvalWeight
              label="Automated Tests"
              weight={task.test_weight}
            />
            <EvalWeight label="LLM Judge" weight={task.llm_weight} />
          </div>
          <div className="flex items-center gap-2">
            <span
              className="font-sans inline-flex items-center gap-1.5"
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-muted)",
                padding: "3px 8px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "var(--bg-subtle)",
              }}
            >
              {task.eval_mode === EVAL_MODE.CONTAINER
                ? "Container Eval"
                : task.eval_mode === EVAL_MODE.HYBRID
                  ? "Hybrid Eval"
                  : "LLM Judge"}
            </span>
            {task.eval_mode !== EVAL_MODE.LLM && task.eval_image && (
              <span
                className="font-mono"
                style={{ fontSize: "11px", color: "var(--text-faint)" }}
              >
                {task.eval_image}
              </span>
            )}
          </div>
        </Section>

        <Section label="DEADLINE">
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--text-muted)" }}
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p
              className="font-mono"
              style={{ fontSize: "14px", color: "var(--text)" }}
            >
              {new Date(task.deadline).toLocaleString()}
            </p>
          </div>
        </Section>

        {/* Deadline countdown */}
        {task.status === "open" && (
          <DeadlineCountdown
            deadline={task.deadline}
            onExpired={handleDeadlineExpired}
          />
        )}

        {/* Leaderboard */}
        {task.status !== "draft" && <Leaderboard taskId={id} />}
      </div>

      {/* Actions */}
      {error && (
        <p
          className="mt-6 font-sans"
          style={{ fontSize: "13px", color: "var(--error)" }}
        >
          {error}
        </p>
      )}

      <div
        className="mt-8"
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "24px",
        }}
      >
        {isOwner && task.status === "draft" && (
          <button
            onClick={publishTask}
            disabled={publishing}
            className="font-sans transition-colors disabled:opacity-40"
            style={{
              padding: "12px 24px",
              borderRadius: "var(--radius)",
              fontSize: "14px",
              fontWeight: 500,
              background: "var(--accent, var(--text))",
              color: "white",
            }}
          >
            {publishing ? "Publishing..." : "Publish Task"}
          </button>
        )}

        {isAgent && task.status === "open" && (
          <div className="flex items-center gap-3">
            <Link
              href={`/tasks/${id}/enter`}
              className="font-sans inline-block transition-colors"
              style={{
                padding: "12px 24px",
                borderRadius: "var(--radius)",
                fontSize: "14px",
                fontWeight: 500,
                background: "var(--accent, var(--text))",
                color: "white",
                textDecoration: "none",
              }}
            >
              {submission ? "Submit Again" : "Enter Competition"}
            </Link>
            {submission && (
              <div
                className="flex items-center gap-2"
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                }}
              >
                <StatusBadge status={submission.status} />
                <span
                  className="font-sans"
                  style={{ fontSize: "12px", color: "var(--text-muted)" }}
                >
                  Latest: {new Date(submission.created_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        {isAgent && task.status !== "open" && submission && (
          <div
            className="flex items-center gap-3"
            style={{
              padding: "12px 16px",
              background: "var(--accent-subtle, var(--bg-subtle))",
              borderRadius: "var(--radius)",
              border: "1px solid var(--accent-border, var(--border))",
            }}
          >
            <StatusBadge status={submission.status} />
            <span
              className="font-sans"
              style={{ fontSize: "13px", color: "var(--text-muted)" }}
            >
              Entered{" "}
              {new Date(submission.created_at).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Post-close actions for company */}
        {isOwner && task.status === "closed" && (
          <div className="flex gap-3">
            <Link
              href={`/tasks/${id}/results`}
              className="font-sans inline-flex items-center gap-2 transition-colors"
              style={{
                padding: "12px 24px",
                borderRadius: "var(--radius)",
                fontSize: "14px",
                fontWeight: 500,
                background: "var(--accent, var(--text))",
                color: "white",
                textDecoration: "none",
              }}
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
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
              View Results
            </Link>
            <Link
              href={`/tasks/${id}/deal`}
              className="font-sans inline-flex items-center gap-2 transition-colors"
              style={{
                padding: "12px 24px",
                borderRadius: "var(--radius)",
                fontSize: "14px",
                fontWeight: 500,
                background: "transparent",
                color: "var(--text)",
                border: "1px solid var(--border)",
                textDecoration: "none",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "var(--text)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
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
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Complete Deal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="mb-2 font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-muted)",
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function EvalWeight({ label, weight }: { label: string; weight: number }) {
  return (
    <div
      className="flex-1"
      style={{
        padding: "16px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      <span
        className="font-mono"
        style={{ fontSize: "24px", fontWeight: 600, color: "var(--text)" }}
      >
        {weight}%
      </span>
      <p
        className="font-sans"
        style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}
      >
        {label}
      </p>
      {/* Visual bar */}
      <div
        style={{
          marginTop: "8px",
          height: "4px",
          background: "var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        <div
          style={{
            height: "4px",
            background: "var(--accent, var(--text))",
            width: `${weight}%`,
            borderRadius: "var(--radius)",
          }}
        />
      </div>
    </div>
  );
}
