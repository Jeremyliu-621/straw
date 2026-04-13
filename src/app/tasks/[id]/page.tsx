"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { StatusBadge } from "@/components/status-badge";
import { Leaderboard } from "@/components/leaderboard";
import { DeadlineCountdown } from "@/components/deadline-countdown";
import { EVAL_MODE } from "@/constants";
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

  const isOwner = task?.company_id === session?.user?.supabaseId;
  const canCompete = !isOwner;

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

    // Fetch user's submissions for this task (if not the owner)
    fetch(`/api/submissions?task_id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSubmission(data[0]);
        }
      })
      .catch(() => {});
  }, [id, router]);

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
      <div className="min-h-screen bg-[#FDFCFC]">
        <div className="max-w-[1400px] mx-auto border-x border-gray-200 min-h-screen">
          <div className="p-12">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    height: "24px",
                    background: "#f3f4f6",
                    borderRadius: "6px",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#FDFCFC]">
      {/* Full-width header */}
      <div className="border-b border-gray-200 shrink-0">
        <div className="max-w-[1400px] mx-auto border-x border-gray-200 px-8 lg:px-12 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <h1 className="font-sans text-[28px] font-medium tracking-tight text-black leading-none truncate">
                {task.title}
              </h1>
              <StatusBadge status={task.status} />
              <span className="font-sans text-[13px] text-gray-400 shrink-0">
                {task.category}
              </span>
            </div>
            <span className="font-mono text-[28px] font-medium text-black shrink-0 ml-6">
              ${(task.budget_cents / 100).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Two-column layout: left = details, right = leaderboard */}
      <div className="max-w-[1400px] mx-auto border-x border-gray-200 flex-1" style={{ height: "calc(100vh - 73px)", overflow: "hidden" }}>
        <div className="flex flex-col lg:flex-row h-full">
          {/* Left panel — task details */}
          <div className="w-full lg:w-[55%] lg:border-r border-gray-200 overflow-y-auto">
            <div className="px-8 lg:px-12 py-8 space-y-8">
              <Section label="DESCRIPTION">
                <p className="font-sans text-[15px] leading-relaxed text-gray-800">
                  {task.description}
                </p>
              </Section>

              <Section label="INPUT SPECIFICATION">
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  <p className="font-sans text-[14px] leading-relaxed text-gray-800">
                    {task.input_spec}
                  </p>
                </div>
              </Section>

              <Section label="OUTPUT SPECIFICATION">
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  <p className="font-sans text-[14px] leading-relaxed text-gray-800">
                    {task.output_spec}
                  </p>
                </div>
              </Section>

              <Section label="EVALUATION">
                <div className="flex gap-3">
                  <EvalWeight label="Automated Tests" weight={task.test_weight} />
                  <EvalWeight label="LLM Judge" weight={task.llm_weight} />
                </div>
                {task.eval_mode !== EVAL_MODE.LLM && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-sans text-[12px] font-medium text-gray-500 px-2 py-0.5 border border-gray-200 rounded bg-gray-50">
                      {task.eval_mode === EVAL_MODE.CONTAINER ? "Container Eval" : "Hybrid Eval"}
                    </span>
                    {task.eval_image && (
                      <span className="font-mono text-[11px] text-gray-400">
                        {task.eval_image}
                      </span>
                    )}
                  </div>
                )}
              </Section>

              {/* Deadline moved to right panel */}

              {/* Actions */}
              {error && (
                <p className="font-sans text-[13px] text-red-500">{error}</p>
              )}

              <div className="border-t border-gray-200 pt-6">
                {isOwner && task.status === "draft" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.back()}
                      className="font-sans text-[13px] text-gray-400 hover:text-black transition-colors cursor-pointer bg-transparent border-none p-0"
                    >
                      &larr; Back
                    </button>
                    <button
                      onClick={publishTask}
                      disabled={publishing}
                      className="font-sans text-[14px] font-medium bg-black text-white px-6 py-3 transition-colors disabled:opacity-40 hover:bg-gray-800"
                      style={{ borderRadius: "2.5px" }}
                    >
                      {publishing ? "Publishing..." : "Publish Task"}
                    </button>
                  </div>
                )}

                {canCompete && task.status === "open" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.back()}
                      className="font-sans text-[13px] text-gray-400 hover:text-black transition-colors cursor-pointer bg-transparent border-none p-0"
                    >
                      &larr; Back
                    </button>
                    <Link
                      href={`/tasks/${id}/enter`}
                      className="font-sans text-[14px] font-medium bg-black text-white px-6 py-3 hover:bg-gray-800 transition-colors no-underline"
                      style={{ borderRadius: "2.5px" }}
                    >
                      {submission ? "Submit Again" : "Enter Competition"}
                    </Link>
                    {submission && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                        <StatusBadge status={submission.status} />
                        <span className="font-sans text-[12px] text-gray-400">
                          Latest: {new Date(submission.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {canCompete && task.status !== "open" && submission && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-md border border-gray-200">
                    <StatusBadge status={submission.status} />
                    <span className="font-sans text-[13px] text-gray-400">
                      Entered {new Date(submission.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {isOwner && task.status === "closed" && (
                  <div className="flex gap-3">
                    <Link
                      href={`/tasks/${id}/results`}
                      className="font-sans text-[14px] font-medium bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors no-underline inline-flex items-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3v18h18" />
                        <path d="m19 9-5 5-4-4-3 3" />
                      </svg>
                      View Results
                    </Link>
                    <Link
                      href={`/tasks/${id}/deal`}
                      className="font-sans text-[14px] font-medium text-black px-6 py-3 rounded-md border border-gray-200 hover:border-black transition-colors no-underline inline-flex items-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      Complete Deal
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel — leaderboard */}
          <div className="w-full lg:w-[45%] overflow-y-auto">
            <div className="px-8 lg:px-8 py-8">
              {/* Deadline + countdown */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
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
                    className="text-gray-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <p className="font-mono text-[15px] text-black">
                    {new Date(task.deadline).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {task.status === "open" && (
                  <DeadlineCountdown
                    deadline={task.deadline}
                    onExpired={handleDeadlineExpired}
                    compact
                  />
                )}
              </div>

              {task.status !== "draft" ? (
                <Leaderboard taskId={id} />
              ) : (
                <div className="text-center py-16">
                  <p className="font-sans text-[13px] text-gray-400">
                    Leaderboard appears after publishing
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
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
      <p className="mb-2 font-sans text-[11px] font-medium tracking-[0.06em] uppercase text-gray-400">
        {label}
      </p>
      {children}
    </div>
  );
}

function EvalWeight({ label, weight }: { label: string; weight: number }) {
  return (
    <div className="flex-1 px-4 py-3 border border-gray-200 rounded-md">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[18px] font-semibold text-black leading-none">
          {weight}%
        </span>
        <div className="flex-1 h-1 bg-gray-100 rounded-full">
          <div
            className="h-1 bg-black rounded-full"
            style={{ width: `${weight}%` }}
          />
        </div>
      </div>
      <p className="font-sans text-[12px] text-gray-400 mt-1">
        {label}
      </p>
    </div>
  );
}
