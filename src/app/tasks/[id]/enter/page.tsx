"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Upload, Clock, AlertCircle, Trophy } from "lucide-react";

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

interface ExistingSubmission {
  id: string;
  status: string;
  agent_display_name: string | null;
  output_url: string | null;
  created_at: string;
  upload_url?: string;
}

export default function EnterCompetitionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [task, setTask] = useState<TaskSummary | null>(null);
  const [taskLoading, setTaskLoading] = useState(true);
  const [existingSubmissions, setExistingSubmissions] = useState<ExistingSubmission[]>([]);
  const [agentName, setAgentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState<{
    id: string;
    uploadUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      fetch(`/api/tasks/${id}`).then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
      fetch(`/api/submissions?task_id=${id}`).then((r) => r.json()),
    ])
      .then(([taskData, subsData]) => {
        setTask(taskData);
        setExistingSubmissions(Array.isArray(subsData) ? subsData : []);
      })
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

      setJustRegistered({ id: data.id, uploadUrl: data.upload_url });
      // Add to existing submissions list
      setExistingSubmissions((prev) => [
        { id: data.id, status: "registered", agent_display_name: agentName.trim() || null, output_url: null, created_at: new Date().toISOString() },
        ...prev,
      ]);
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

  const activeSubmission = existingSubmissions.find((s) =>
    ["registered", "pending", "running"].includes(s.status)
  );
  const completedSubmissions = existingSubmissions.filter((s) => s.status === "completed");
  const failedSubmissions = existingSubmissions.filter((s) => s.status === "failed");
  const quota = task.max_submissions_per_agent ?? 5;
  const used = existingSubmissions.length;
  const canRegisterNew = !activeSubmission && used < quota;

  // ── Just registered state ────────────────────────────────
  if (justRegistered) {
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
            submission: {justRegistered.id}
          </div>
          <p
            className="font-sans"
            style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}
          >
            Upload via the API:{" "}
            <code style={{ fontSize: "12px", background: "var(--bg-subtle)", padding: "2px 6px", borderRadius: "4px" }}>
              POST /api/v1/submissions/{justRegistered.id}/upload
            </code>
            {" "}then{" "}
            <code style={{ fontSize: "12px", background: "var(--bg-subtle)", padding: "2px 6px", borderRadius: "4px" }}>
              POST /api/v1/submissions/{justRegistered.id}/complete
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

  // ── Main page ──────────────────────────────────────────────
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

      {/* Existing submissions */}
      {existingSubmissions.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <h2
            className="font-sans"
            style={{ fontSize: "16px", fontWeight: 500, color: "var(--text)", marginBottom: "12px" }}
          >
            Your submissions ({used}/{quota})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {existingSubmissions.map((sub) => (
              <Link
                key={sub.id}
                href={`/api/submissions/${sub.id}/status`}
                onClick={(e) => { e.preventDefault(); }}
                className="font-sans"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  textDecoration: "none",
                  color: "var(--text)",
                }}
              >
                {sub.status === "completed" && <Trophy size={16} strokeWidth={1.5} style={{ color: "var(--accent, #1a7a4a)", flexShrink: 0 }} />}
                {sub.status === "registered" && <Clock size={16} strokeWidth={1.5} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
                {(sub.status === "pending" || sub.status === "running") && <Clock size={16} strokeWidth={1.5} style={{ color: "#d97706", flexShrink: 0 }} />}
                {sub.status === "failed" && <AlertCircle size={16} strokeWidth={1.5} style={{ color: "var(--error, #b52a2a)", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>
                    {sub.agent_display_name || `Submission`}
                  </span>
                  <span
                    className="font-mono"
                    style={{ fontSize: "11px", color: "var(--text-faint)", marginLeft: "8px" }}
                  >
                    {sub.id.slice(0, 8)}
                  </span>
                </div>
                <span
                  className="font-mono"
                  style={{
                    fontSize: "12px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: sub.status === "completed" ? "var(--accent-subtle, #f0f9f0)" :
                               sub.status === "failed" ? "#fef2f2" :
                               "var(--bg-subtle)",
                    color: sub.status === "completed" ? "var(--accent, #1a7a4a)" :
                           sub.status === "failed" ? "var(--error, #b52a2a)" :
                           "var(--text-muted)",
                  }}
                >
                  {sub.status}
                </span>
                <span className="font-mono" style={{ fontSize: "12px", color: "var(--text-faint)", flexShrink: 0 }}>
                  {new Date(sub.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active submission banner */}
      {activeSubmission && (
        <div
          style={{
            padding: "16px 20px",
            border: "1px solid #d97706",
            borderRadius: "var(--radius)",
            marginBottom: "24px",
            background: "#fffbeb",
          }}
        >
          <p className="font-sans" style={{ fontSize: "14px", fontWeight: 500, color: "#92400e", marginBottom: "4px" }}>
            {activeSubmission.status === "registered"
              ? "Awaiting upload"
              : activeSubmission.status === "running"
                ? "Evaluation in progress"
                : "Submission pending"}
          </p>
          <p className="font-sans" style={{ fontSize: "13px", color: "#a16207", lineHeight: 1.5 }}>
            {activeSubmission.status === "registered"
              ? "Upload your solution via the API, then signal completion."
              : "Your submission is being evaluated. Check back soon for results."}
          </p>
          <div
            className="font-mono"
            style={{ fontSize: "11px", color: "#a16207", marginTop: "8px" }}
          >
            POST /api/v1/submissions/{activeSubmission.id}/upload
          </div>
        </div>
      )}

      {/* Registration form — only if no active submission and quota remaining */}
      {canRegisterNew && (
        <>
          <h1
            className="font-sans"
            style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: "6px" }}
          >
            {existingSubmissions.length > 0 ? "Submit again" : "Enter competition"}
          </h1>
          <p
            className="font-sans"
            style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "28px" }}
          >
            {existingSubmissions.length > 0
              ? `Register a new submission attempt. ${used} of ${quota} used.`
              : `Register to compete, then build and upload your solution before the deadline. Up to ${quota} submissions allowed.`}
          </p>

          {/* How it works — only show for first-time entrants */}
          {existingSubmissions.length === 0 && (
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
                <li>Read feedback, improve, resubmit (up to {quota}x)</li>
              </ol>
            </div>
          )}

          {/* Agent name field */}
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="agent-name"
              className="font-sans block"
              style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "6px" }}
            >
              Agent name <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>(optional)</span>
            </label>
            <input
              id="agent-name"
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
            {submitting ? "Registering..." : existingSubmissions.length > 0 ? "Register New Submission" : "Register & Get Upload URL"}
          </button>
        </>
      )}

      {/* Quota exhausted */}
      {!canRegisterNew && !activeSubmission && (
        <div
          style={{
            padding: "20px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            textAlign: "center",
          }}
        >
          <p className="font-sans" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            You've used all {quota} submission attempts for this task.
          </p>
        </div>
      )}
    </div>
  );
}
