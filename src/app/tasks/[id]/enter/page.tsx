"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Upload, Clock, AlertCircle, Trophy, Copy, FileArchive, Loader2 } from "lucide-react";

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

  // Upload UI state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setUploadError(null);
    if (!file.name.endsWith(".zip")) {
      setUploadError("Please upload a .zip file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File must be under 50 MB");
      return;
    }
    setUploadFile(file);
  }, []);

  const handleUpload = useCallback(async (submissionId: string) => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch(`/api/v1/submissions/${submissionId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = data.error?.message ?? data.error ?? "Upload failed";
        setUploadError(msg);
        return;
      }
      setUploadSuccess(true);
      // Refresh submissions list
      const subsRes = await fetch(`/api/submissions?task_id=${id}`);
      const subsData = await subsRes.json();
      setExistingSubmissions(Array.isArray(subsData) ? subsData : []);
    } catch {
      setUploadError("Network error — please try again");
    } finally {
      setUploading(false);
    }
  }, [uploadFile, id]);

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
    // After successful upload
    if (uploadSuccess) {
      return (
        <div className="mx-auto max-w-xl" style={{ padding: "48px 32px" }}>
          <div style={{ padding: "32px", border: "1px solid var(--border)", borderRadius: "var(--radius)", textAlign: "center" }}>
            <div className="flex items-center justify-center mx-auto" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--accent-subtle, #f0f9f0)", marginBottom: "16px" }}>
              <Check size={24} strokeWidth={2} style={{ color: "var(--accent, #1a7a4a)" }} />
            </div>
            <h2 className="font-sans" style={{ fontSize: "22px", fontWeight: 500, color: "var(--text)", marginBottom: "8px" }}>
              Upload complete
            </h2>
            <p className="font-sans" style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "24px" }}>
              Your submission is being evaluated. Check the task page for results.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href={`/tasks/${id}`} className="font-sans inline-flex items-center gap-2" style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 500, color: "var(--bg)", background: "var(--text)", borderRadius: "var(--radius)", textDecoration: "none" }}>
                View results
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-xl" style={{ padding: "32px" }}>
        {/* Header */}
        <div className="flex items-center gap-3" style={{ marginBottom: "24px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--accent-subtle, #f0f9f0)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Check size={18} strokeWidth={2} style={{ color: "var(--accent, #1a7a4a)" }} />
          </div>
          <div>
            <h2 className="font-sans" style={{ fontSize: "20px", fontWeight: 500, color: "var(--text)" }}>
              You're registered — now upload your solution
            </h2>
            <p className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Your submission must include a <strong>SUBMISSION.md</strong> file.
            </p>
          </div>
        </div>

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
          onClick={() => !uploadFile && fileInputRef.current?.click()}
          style={{
            padding: uploadFile ? "16px 20px" : "32px 20px",
            border: `2px dashed ${dragOver ? "var(--accent, #1a7a4a)" : uploadFile ? "var(--accent, #1a7a4a)" : "var(--border)"}`,
            borderRadius: "var(--radius)",
            background: dragOver ? "var(--accent-subtle, #f0f9f0)" : uploadFile ? "var(--accent-subtle, #f0f9f0)" : "var(--bg)",
            textAlign: "center",
            cursor: uploadFile ? "default" : "pointer",
            transition: "border-color 0.15s, background 0.15s",
            marginBottom: "16px",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />
          {uploadFile ? (
            <div className="flex items-center gap-3">
              <FileArchive size={20} strokeWidth={1.5} style={{ color: "var(--accent, #1a7a4a)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <p className="font-mono truncate" style={{ fontSize: "14px", color: "var(--text)" }}>{uploadFile.name}</p>
                <p className="font-sans" style={{ fontSize: "12px", color: "var(--text-muted)" }}>{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadError(null); }}
                className="font-sans"
                style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <Upload size={24} strokeWidth={1.5} style={{ color: "var(--text-faint)", marginBottom: "8px" }} />
              <p className="font-sans" style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Drag & drop your .zip file here, or click to browse
              </p>
              <p className="font-sans" style={{ fontSize: "12px", color: "var(--text-faint)" }}>
                Max 50 MB. Must include SUBMISSION.md.
              </p>
            </>
          )}
        </div>

        {/* Upload error */}
        {uploadError && (
          <p className="font-sans" style={{ fontSize: "13px", color: "var(--error, #b52a2a)", marginBottom: "12px" }}>
            {uploadError}
          </p>
        )}

        {/* Upload button */}
        {uploadFile && (
          <button
            onClick={() => handleUpload(justRegistered.id)}
            disabled={uploading}
            className="w-full font-sans transition-colors disabled:opacity-40"
            style={{
              padding: "14px 24px",
              fontSize: "15px",
              fontWeight: 500,
              color: "white",
              background: "var(--accent, var(--text))",
              borderRadius: "2.5px",
              border: "none",
              cursor: uploading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "24px",
            }}
          >
            {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} strokeWidth={2} /> Upload & evaluate</>}
          </button>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3" style={{ margin: "24px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span className="font-sans" style={{ fontSize: "12px", color: "var(--text-faint)" }}>or upload via API</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* Submission ID */}
        <CopyBlock label="Submission ID" value={justRegistered.id} field="sub-id" copiedField={copiedField} onCopy={copyToClipboard} />

        {/* Server-mediated upload */}
        <CopyBlock
          label="Upload (with auth)"
          value={`curl -X POST ${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/submissions/${justRegistered.id}/upload \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -F file=@solution.zip`}
          field="curl-upload"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        {/* Presigned URL upload */}
        <CopyBlock
          label="Upload (presigned URL — no auth needed)"
          value={`curl -X PUT "${justRegistered.uploadUrl}" \\\n  -H "Content-Type: application/zip" \\\n  --data-binary @solution.zip`}
          field="curl-presigned"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        {/* Signal completion (for presigned URL flow) */}
        <CopyBlock
          label="Then signal completion (presigned URL flow only)"
          value={`curl -X POST ${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/submissions/${justRegistered.id}/complete \\\n  -H "Authorization: Bearer YOUR_API_KEY"`}
          field="curl-complete"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        {/* Nav buttons */}
        <div className="flex items-center justify-center gap-3" style={{ marginTop: "24px" }}>
          <Link href={`/tasks/${id}`} className="font-sans inline-flex items-center gap-2" style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 500, color: "var(--text)", border: "1px solid var(--border)", borderRadius: "var(--radius)", textDecoration: "none" }}>
            View task
          </Link>
          <Link href="/dashboard/agent" className="font-sans inline-flex items-center gap-2" style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 500, color: "var(--text)", border: "1px solid var(--border)", borderRadius: "var(--radius)", textDecoration: "none" }}>
            Dashboard
          </Link>
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
      {activeSubmission && activeSubmission.status !== "registered" && (
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
            {activeSubmission.status === "running"
              ? "Evaluation in progress"
              : "Submission pending"}
          </p>
          <p className="font-sans" style={{ fontSize: "13px", color: "#a16207", lineHeight: 1.5 }}>
            Your submission is being evaluated. Check back soon for results.
          </p>
        </div>
      )}

      {/* Upload zone for registered (awaiting upload) submission */}
      {activeSubmission && activeSubmission.status === "registered" && (
        <div style={{ marginBottom: "24px" }}>
          <p className="font-sans" style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", marginBottom: "12px" }}>
            Upload your solution
          </p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
            onClick={() => !uploadFile && fileInputRef.current?.click()}
            style={{
              padding: uploadFile ? "12px 16px" : "24px 16px",
              border: `2px dashed ${dragOver ? "var(--accent, #1a7a4a)" : uploadFile ? "var(--accent, #1a7a4a)" : "var(--border)"}`,
              borderRadius: "var(--radius)",
              background: dragOver ? "var(--accent-subtle, #f0f9f0)" : uploadFile ? "var(--accent-subtle, #f0f9f0)" : "var(--bg)",
              textAlign: "center",
              cursor: uploadFile ? "default" : "pointer",
              transition: "border-color 0.15s, background 0.15s",
              marginBottom: "12px",
            }}
          >
            <input ref={fileInputRef} type="file" accept=".zip" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
            {uploadFile ? (
              <div className="flex items-center gap-3">
                <FileArchive size={18} strokeWidth={1.5} style={{ color: "var(--accent, #1a7a4a)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <p className="font-mono truncate" style={{ fontSize: "13px", color: "var(--text)" }}>{uploadFile.name}</p>
                  <p className="font-sans" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadError(null); }} className="font-sans" style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
              </div>
            ) : (
              <>
                <Upload size={20} strokeWidth={1.5} style={{ color: "var(--text-faint)", marginBottom: "6px" }} />
                <p className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>Drop .zip here or click to browse</p>
              </>
            )}
          </div>
          {uploadError && (
            <p className="font-sans" style={{ fontSize: "12px", color: "var(--error, #b52a2a)", marginBottom: "8px" }}>{uploadError}</p>
          )}
          {uploadFile && (
            <button
              onClick={() => handleUpload(activeSubmission.id)}
              disabled={uploading}
              className="w-full font-sans transition-colors disabled:opacity-40"
              style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 500, color: "white", background: "var(--accent, var(--text))", borderRadius: "2.5px", border: "none", cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} strokeWidth={2} /> Upload & evaluate</>}
            </button>
          )}
          {uploadSuccess && (
            <div style={{ padding: "12px 16px", background: "var(--accent-subtle, #f0f9f0)", border: "1px solid var(--accent, #1a7a4a)", borderRadius: "var(--radius)", marginTop: "12px" }}>
              <p className="font-sans" style={{ fontSize: "13px", color: "var(--accent, #1a7a4a)", fontWeight: 500 }}>Upload complete — evaluation queued</p>
            </div>
          )}
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

/* ── Helper Components ────────────────────────────────────── */

function CopyBlock({ label, value, field, copiedField, onCopy }: {
  label: string;
  value: string;
  field: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <p className="font-sans" style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "4px" }}>
        {label}
      </p>
      <div
        className="flex items-start gap-2"
        style={{
          padding: "10px 12px",
          background: "var(--bg-subtle)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        <pre className="font-mono flex-1" style={{ fontSize: "11px", color: "var(--text)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5 }}>
          {value}
        </pre>
        <button
          onClick={() => onCopy(value, field)}
          style={{ background: "none", border: "none", cursor: "pointer", color: copiedField === field ? "var(--accent, #1a7a4a)" : "var(--text-muted)", flexShrink: 0, padding: "2px" }}
        >
          {copiedField === field ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
