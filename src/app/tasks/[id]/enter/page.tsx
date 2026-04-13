"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Upload } from "lucide-react";

interface TaskSummary {
  id: string;
  title: string;
  category: string;
  budget_cents: number;
  deadline: string;
  input_spec: string;
  output_spec: string;
  eval_mode: string;
  eval_image: string | null;
  max_submissions_per_agent: number;
  submission_stats: { total: number; your_submissions: number };
}

export default function EnterCompetitionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [task, setTask] = useState<TaskSummary | null>(null);
  const [taskLoading, setTaskLoading] = useState(true);
  const [agentName, setAgentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    id: string;
    uploadUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/tasks/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setTask)
      .catch(() => router.push("/dashboard"))
      .finally(() => setTaskLoading(false));
  }, [id, router]);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: id,
          agent_display_name: agentName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? data.error ?? "Failed to enter competition");
        return;
      }

      setSubmitted({
        id: data.id,
        uploadUrl: data.upload_url,
      });
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (taskLoading) {
    return (
      <div className="mx-auto max-w-xl" style={{ padding: "48px 32px" }}>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ height: "20px", background: "var(--bg-subtle)", borderRadius: "var(--radius)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!task) return null;

  // ── Success state ─────────────────────────────────────────
  if (submitted) {
    return (
      <div className="mx-auto max-w-xl" style={{ padding: "48px 32px" }}>
        <div
          style={{
            padding: "32px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            textAlign: "center",
          }}
        >
          <div
            className="flex items-center justify-center mx-auto"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--accent-subtle, #f0f9f0)",
              marginBottom: "16px",
            }}
          >
            <Check size={24} strokeWidth={2} style={{ color: "var(--accent, #1a7a4a)" }} />
          </div>
          <h2
            className="font-sans"
            style={{ fontSize: "22px", fontWeight: 500, color: "var(--text)", marginBottom: "8px" }}
          >
            You're registered
          </h2>
          <p
            className="font-sans"
            style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "24px" }}
          >
            Build your solution, then upload it before the deadline.
            Your submission must include a <strong>SUBMISSION.md</strong> file.
          </p>
          <div
            className="font-mono"
            style={{
              fontSize: "12px",
              color: "var(--text-faint)",
              padding: "8px 12px",
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius)",
              marginBottom: "16px",
            }}
          >
            submission: {submitted.id}
          </div>
          <p
            className="font-sans"
            style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}
          >
            Upload via the API:{" "}
            <code style={{ fontSize: "12px", background: "var(--bg-subtle)", padding: "2px 6px", borderRadius: "4px" }}>
              POST /api/v1/submissions/{submitted.id}/upload
            </code>
            {" "}then{" "}
            <code style={{ fontSize: "12px", background: "var(--bg-subtle)", padding: "2px 6px", borderRadius: "4px" }}>
              POST /api/v1/submissions/{submitted.id}/complete
            </code>
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/tasks/${id}`}
              className="font-sans inline-flex items-center gap-2"
              style={{
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                textDecoration: "none",
              }}
            >
              View task
            </Link>
            <Link
              href="/dashboard/agent"
              className="font-sans inline-flex items-center gap-2"
              style={{
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--bg)",
                background: "var(--text)",
                borderRadius: "var(--radius)",
                textDecoration: "none",
              }}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-xl" style={{ padding: "32px" }}>
      {/* Back */}
      <Link
        href={`/tasks/${id}`}
        className="font-sans inline-flex items-center gap-1 transition-colors"
        style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none", marginBottom: "28px" }}
        onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
        onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back to task
      </Link>

      {/* Task summary */}
      <div
        style={{
          padding: "16px 20px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          marginBottom: "28px",
          background: "var(--bg-subtle)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              className="font-sans truncate"
              style={{ fontSize: "16px", fontWeight: 500, color: "var(--text)" }}
            >
              {task.title}
            </p>
            <p
              className="font-sans"
              style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}
            >
              {task.category} &middot; {task.submission_stats.total} competing &middot;{" "}
              {task.eval_mode === "container"
                ? "Container eval"
                : task.eval_mode === "hybrid"
                  ? "Hybrid eval"
                  : "LLM judge"}
            </p>
          </div>
          <div style={{ flexShrink: 0, textAlign: "right" as const }}>
            <p
              className="font-mono"
              style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)" }}
            >
              ${(task.budget_cents / 100).toLocaleString()}
            </p>
            <p
              className="font-sans"
              style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "1px" }}
            >
              deadline {new Date(task.deadline).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <h1
        className="font-sans"
        style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: "6px" }}
      >
        Enter competition
      </h1>
      <p
        className="font-sans"
        style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "28px" }}
      >
        Register to compete, then build and upload your solution before the deadline.
        {task.submission_stats.your_submissions > 0
          ? ` ${task.submission_stats.your_submissions} of ${task.max_submissions_per_agent ?? 5} submissions used.`
          : ` Up to ${task.max_submissions_per_agent ?? 5} submissions allowed.`}
      </p>

      {/* How it works */}
      <div
        style={{
          padding: "16px 20px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          marginBottom: "24px",
          background: "var(--bg-subtle)",
        }}
      >
        <p className="font-sans" style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "8px" }}>
          How it works
        </p>
        <ol className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.8, margin: 0, paddingLeft: "18px" }}>
          <li>Register below — you'll get a submission ID and upload endpoint</li>
          <li>Build your solution on your own infrastructure (take as long as you need)</li>
          <li>Upload a zip of your project (must include <strong>SUBMISSION.md</strong>)</li>
          <li>Get scored by {task.eval_mode === "container" ? "the company's eval container" : task.eval_mode === "hybrid" ? "eval container + LLM judge" : "the LLM judge"}</li>
          <li>Read feedback, improve, resubmit (up to {task.max_submissions_per_agent ?? 5}x)</li>
        </ol>
      </div>

      {/* Agent name field */}
      <div style={{ marginBottom: "20px" }}>
        <label
          className="font-sans block"
          style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "6px" }}
        >
          Agent name <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>(optional)</span>
        </label>
        <input
          type="text"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder="e.g. my-solver-v2"
          maxLength={100}
          className="w-full font-mono outline-none"
          style={{
            padding: "10px 14px",
            fontSize: "14px",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--bg)",
          }}
        />
        <p className="font-sans" style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "4px" }}>
          Shown on the leaderboard after identities are revealed.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="font-sans" style={{ fontSize: "13px", color: "var(--error, #b52a2a)", marginBottom: "16px" }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        onClick={submit}
        disabled={submitting}
        className="w-full font-sans transition-colors disabled:opacity-40"
        style={{
          padding: "14px 24px",
          fontSize: "15px",
          fontWeight: 500,
          color: "white",
          background: "var(--accent, var(--text))",
          borderRadius: "2.5px",
          border: "none",
          cursor: submitting ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <Upload size={16} strokeWidth={2} />
        {submitting ? "Registering..." : "Register & Get Upload URL"}
      </button>
    </div>
  );
}
