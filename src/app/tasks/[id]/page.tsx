"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { StatusBadge } from "@/components/status-badge";
import { ROLE_COMPANY, ROLE_AGENT_BUILDER } from "@/constants";

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
  const [entering, setEntering] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompany = session?.user?.role === ROLE_COMPANY;
  const isAgent = session?.user?.role === ROLE_AGENT_BUILDER;
  const isOwner = isCompany && task?.company_id === session?.user?.supabaseId;

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

    // Check for existing submission if agent
    if (isAgent) {
      fetch(`/api/submissions?task_id=${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) setSubmission(data);
        })
        .catch(() => {});
    }
  }, [id, isAgent, router]);

  async function enterCompetition() {
    setEntering(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to enter competition");
        return;
      }
      const data = await res.json();
      setSubmission(data);
    } catch {
      setError("Network error");
    } finally {
      setEntering(false);
    }
  }

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
              style={{ height: "24px", background: "var(--bg-subtle)", borderRadius: "6px" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl" style={{ padding: "32px" }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="font-sans"
              style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
            >
              {task.title}
            </h1>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={task.status} />
            <span className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {task.category}
            </span>
          </div>
        </div>
        <span className="font-mono" style={{ fontSize: "24px", fontWeight: 500, color: "var(--text)" }}>
          ${(task.budget_cents / 100).toLocaleString()}
        </span>
      </div>

      <div className="mt-8 space-y-6">
        <Section label="DESCRIPTION">
          <p className="font-sans" style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text)" }}>
            {task.description}
          </p>
        </Section>

        <Section label="INPUT SPECIFICATION">
          <p className="font-sans" style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text)" }}>
            {task.input_spec}
          </p>
        </Section>

        <Section label="OUTPUT SPECIFICATION">
          <p className="font-sans" style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text)" }}>
            {task.output_spec}
          </p>
        </Section>

        <Section label="EVALUATION">
          <div className="flex gap-8">
            <div>
              <span className="font-mono" style={{ fontSize: "24px", fontWeight: 600, color: "var(--text)" }}>
                {task.test_weight}%
              </span>
              <p className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Automated tests
              </p>
            </div>
            <div>
              <span className="font-mono" style={{ fontSize: "24px", fontWeight: 600, color: "var(--text)" }}>
                {task.llm_weight}%
              </span>
              <p className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                LLM judge
              </p>
            </div>
          </div>
        </Section>

        <Section label="DEADLINE">
          <p className="font-mono" style={{ fontSize: "14px", color: "var(--text)" }}>
            {new Date(task.deadline).toLocaleString()}
          </p>
        </Section>
      </div>

      {/* Actions */}
      {error && (
        <p className="mt-6 font-sans" style={{ fontSize: "13px", color: "var(--error)" }}>
          {error}
        </p>
      )}

      <div className="mt-8" style={{ borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
        {isOwner && task.status === "draft" && (
          <button
            onClick={publishTask}
            disabled={publishing}
            className="font-sans transition-colors disabled:opacity-40"
            style={{
              padding: "10px 16px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              background: "var(--text)",
              color: "var(--inverse-text)",
            }}
          >
            {publishing ? "Publishing..." : "Publish Task"}
          </button>
        )}

        {isAgent && task.status === "open" && !submission && (
          <button
            onClick={enterCompetition}
            disabled={entering}
            className="font-sans transition-colors disabled:opacity-40"
            style={{
              padding: "10px 16px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              background: "var(--text)",
              color: "var(--inverse-text)",
            }}
          >
            {entering ? "Entering..." : "Enter Competition"}
          </button>
        )}

        {isAgent && submission && (
          <div className="flex items-center gap-3">
            <StatusBadge status={submission.status} />
            <span className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Entered {new Date(submission.created_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
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
