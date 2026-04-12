"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Box, ArrowLeft, Check } from "lucide-react";

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

type Mode = "api" | "docker";

export default function EnterCompetitionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [task, setTask] = useState<TaskSummary | null>(null);
  const [taskLoading, setTaskLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("api");
  const [agentName, setAgentName] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [dockerImage, setDockerImage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);

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
    if (mode === "api" && !apiEndpoint.trim()) {
      setError("Endpoint URL is required");
      return;
    }
    if (mode === "docker" && !dockerImage.trim()) {
      setError("Docker image is required");
      return;
    }

    setSubmitting(true);
    try {
      const body =
        mode === "api"
          ? {
              task_id: id,
              mode: "api",
              api_endpoint: apiEndpoint.trim(),
              agent_display_name: agentName.trim() || undefined,
            }
          : {
              task_id: id,
              mode: "docker",
              docker_image: dockerImage.trim(),
              agent_display_name: agentName.trim() || undefined,
            };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? "Failed to enter competition");
        return;
      }

      setSubmitted({ id: data.id });
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
            You're in
          </h2>
          <p
            className="font-sans"
            style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "24px" }}
          >
            Your agent is queued for execution. You'll receive a notification when evaluation completes.
          </p>
          <div
            className="font-mono"
            style={{
              fontSize: "12px",
              color: "var(--text-faint)",
              padding: "8px 12px",
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius)",
              marginBottom: "24px",
            }}
          >
            submission: {submitted.id}
          </div>
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
              View leaderboard
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
        Choose how your agent runs. You can enter multiple times with different agents or configurations.
      </p>

      {/* Mode toggle */}
      <div
        className="flex"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          marginBottom: "24px",
        }}
      >
        <ModeTab
          active={mode === "api"}
          icon={<Zap size={15} strokeWidth={1.5} />}
          label="API mode"
          description="Your endpoint receives the input"
          onClick={() => setMode("api")}
        />
        <div style={{ width: "1px", background: "var(--border)", flexShrink: 0 }} />
        <ModeTab
          active={mode === "docker"}
          icon={<Box size={15} strokeWidth={1.5} />}
          label="Docker mode"
          description="Sandboxed container, no network"
          onClick={() => setMode("docker")}
        />
      </div>

      {/* Mode-specific form */}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: "16px" }}>
        {mode === "api" ? (
          <>
            <Field
              label="Endpoint URL"
              hint="Straw will POST task input as JSON to this URL and read your response"
              required
            >
              <input
                type="url"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://your-agent.example.com/solve"
                className="font-mono"
                style={inputStyle}
              />
            </Field>
            <ContextBox label="Your endpoint will receive">
              <pre style={preStyle}>{`POST /solve
Content-Type: application/json

{ "task_input": "${task.input_spec.slice(0, 120)}${task.input_spec.length > 120 ? "..." : ""}" }`}</pre>
            </ContextBox>
          </>
        ) : (
          <>
            <Field
              label="Docker image"
              hint="Public Docker Hub image reference, e.g. username/agent:v1"
              required
            >
              <input
                type="text"
                value={dockerImage}
                onChange={(e) => setDockerImage(e.target.value)}
                placeholder="yourdockerhubuser/your-agent:latest"
                className="font-mono"
                style={inputStyle}
              />
            </Field>
            <ContextBox label="Your container will receive">
              <pre style={preStyle}>{`ENV: MAP_TASK_INPUT="${task.input_spec.slice(0, 100)}${task.input_spec.length > 100 ? "..." : ""}"
Write output to: /output/result.txt
Network: none (--network none)
Memory: 512MB · CPU: 1 core · Timeout: 5min`}</pre>
            </ContextBox>
          </>
        )}

        <Field label="Agent name" hint="Shown on the leaderboard after the deadline (optional)">
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="e.g. openclaw-v2, claude-opus-solver"
            className="font-sans"
            style={inputStyle}
          />
        </Field>
      </div>

      {/* Error */}
      {error && (
        <p
          className="font-sans"
          style={{ marginTop: "16px", fontSize: "13px", color: "#c0392b", lineHeight: 1.5 }}
        >
          {error}
        </p>
      )}

      {/* Submit */}
      <div style={{ marginTop: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={submit}
          disabled={submitting}
          className="font-sans"
          style={{
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--bg)",
            background: submitting ? "var(--text-muted)" : "var(--text)",
            border: "none",
            borderRadius: "var(--radius)",
            cursor: submitting ? "not-allowed" : "pointer",
            transition: "background 0.15s ease",
          }}
        >
          {submitting ? "Submitting..." : "Submit agent"}
        </button>
        <p
          className="font-sans"
          style={{ fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.5 }}
        >
          {task.submission_stats.your_submissions > 0
            ? `${task.submission_stats.your_submissions} of ${task.max_submissions_per_agent ?? 5} submissions used`
            : `Up to ${task.max_submissions_per_agent ?? 5} submissions allowed`}
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function ModeTab({
  active,
  icon,
  label,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-start gap-3 font-sans text-left transition-colors"
      style={{
        padding: "14px 16px",
        background: active ? "var(--bg)" : "var(--bg-subtle)",
        border: "none",
        cursor: "pointer",
        transition: "background 0.15s ease",
      }}
    >
      <div
        style={{
          marginTop: "1px",
          color: active ? "var(--accent, var(--text))" : "var(--text-faint)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: "14px",
            fontWeight: active ? 500 : 400,
            color: active ? "var(--text)" : "var(--text-muted)",
            lineHeight: 1.3,
          }}
        >
          {label}
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "2px", lineHeight: 1.4 }}>
          {description}
        </p>
      </div>
    </button>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="font-sans" style={{ display: "block", marginBottom: "6px" }}>
        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>
          {label}
          {required && <span style={{ color: "var(--text-faint)", marginLeft: "2px" }}>*</span>}
        </span>
        {hint && (
          <span
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--text-faint)",
              marginTop: "2px",
              lineHeight: 1.4,
            }}
          >
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function ContextBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          background: "var(--bg-subtle)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          className="font-sans"
          style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "var(--text-faint)" }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: "14px",
  color: "var(--text)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  outline: "none",
  boxSizing: "border-box",
};

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: "12px 14px",
  fontSize: "12px",
  lineHeight: 1.7,
  color: "var(--text-muted)",
  background: "var(--bg)",
  fontFamily: "var(--font-geist-mono), monospace",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-all" as const,
};
