"use client";

import { useState, useCallback, useRef } from "react";

interface SubmissionInfo {
  id: string;
  agentName: string;
  dockerImage: string;
}

interface SubmissionStatus {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  evaluated: boolean;
  final_score: number | null;
}

type PipelineState = "idle" | "setting-up" | "running" | "done" | "error";

interface AgentState {
  info: SubmissionInfo;
  status: SubmissionStatus | null;
  phase: "pending" | "running" | "executed" | "evaluating" | "done" | "failed";
}

export default function PipelineTestPage() {
  const [state, setState] = useState<PipelineState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const pollingRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toISOString().slice(11, 19);
    setLog((prev) => [...prev, `[${ts}] ${msg}`]);
  }, []);

  const pollSubmissions = useCallback(
    async (submissions: SubmissionInfo[]) => {
      pollingRef.current = true;
      const remaining = new Set(submissions.map((s) => s.id));

      while (remaining.size > 0 && pollingRef.current) {
        for (const subId of Array.from(remaining)) {
          try {
            const res = await fetch(`/api/submissions/${subId}/status`);
            if (!res.ok) continue;
            const data: SubmissionStatus = await res.json();
            const agentName = submissions.find((s) => s.id === subId)?.agentName ?? "Unknown";

            setAgents((prev) =>
              prev.map((a) => {
                if (a.info.id !== subId) return a;

                let phase: AgentState["phase"] = "pending";
                if (data.status === "failed") phase = "failed";
                else if (data.evaluated) phase = "done";
                else if (data.status === "completed") phase = "evaluating";
                else if (data.status === "running") phase = "running";

                return { ...a, status: data, phase };
              })
            );

            if (data.status === "failed") {
              addLog(`${agentName}: FAILED - ${data.error_message}`);
              remaining.delete(subId);
            } else if (data.evaluated && data.final_score !== null) {
              addLog(`${agentName}: DONE - score ${data.final_score}`);
              remaining.delete(subId);
            }
          } catch {
            // ignore polling errors
          }
        }

        if (remaining.size > 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      pollingRef.current = false;
      setState("done");
      addLog("All submissions resolved.");
    },
    [addLog]
  );

  const runTest = useCallback(async () => {
    setState("setting-up");
    setError(null);
    setTaskId(null);
    setAgents([]);
    setLog([]);
    pollingRef.current = false;

    addLog("Triggering pipeline test...");

    try {
      const res = await fetch("/api/dev/pipeline-test", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Setup failed");
      }

      setTaskId(data.taskId);
      addLog(`Task created: ${data.taskId}`);
      addLog(`${data.submissions.length} submissions enqueued`);

      const initialAgents: AgentState[] = data.submissions.map((sub: SubmissionInfo) => ({
        info: sub,
        status: null,
        phase: "pending" as const,
      }));

      setAgents(initialAgents);
      setState("running");

      pollSubmissions(data.submissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
      addLog(`ERROR: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, [addLog, pollSubmissions]);

  const phaseColors: Record<AgentState["phase"], string> = {
    pending: "bg-gray-100 text-gray-700",
    running: "bg-blue-100 text-blue-800",
    executed: "bg-yellow-100 text-yellow-800",
    evaluating: "bg-purple-100 text-purple-800",
    done: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  const phaseLabels: Record<AgentState["phase"], string> = {
    pending: "Pending",
    running: "Executing",
    executed: "Executed",
    evaluating: "Evaluating",
    done: "Done",
    failed: "Failed",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Pipeline Test</h1>
          <p className="mt-1 text-sm text-gray-500">
            End-to-end test: submit 4 test agents, execute them in Docker, evaluate with LLM judge, verify scores.
          </p>
        </div>

        {/* Prerequisites */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-medium text-gray-900">Prerequisites</h2>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            <li>
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">docker-compose up -d</code> — Redis running
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">cd test-agents && bash build-all.sh</code> — Test images built
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">npm run worker</code> — Execution worker running
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">npm run eval-worker</code> — Evaluation worker running
            </li>
          </ul>
        </div>

        {/* Action */}
        <div className="mb-6">
          <button
            onClick={runTest}
            disabled={state === "setting-up" || state === "running"}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {state === "idle" && "Run Pipeline Test"}
            {state === "setting-up" && "Setting up..."}
            {state === "running" && "Running..."}
            {state === "done" && "Run Again"}
            {state === "error" && "Retry"}
          </button>

          {taskId && (
            <span className="ml-4 text-sm text-gray-500">
              Task: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{taskId}</code>
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {/* Agent Cards */}
        {agents.length > 0 && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {agents.map((agent) => (
              <div
                key={agent.info.id}
                className="rounded-lg border border-gray-200 bg-white p-4 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">{agent.info.agentName}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ${phaseColors[agent.phase]}`}
                  >
                    {phaseLabels[agent.phase]}
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-400">{agent.info.dockerImage}</p>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      agent.phase === "failed"
                        ? "w-full bg-red-400"
                        : agent.phase === "done"
                          ? "w-full bg-green-500"
                          : agent.phase === "evaluating"
                            ? "w-3/4 bg-purple-400"
                            : agent.phase === "running"
                              ? "w-1/2 bg-blue-400"
                              : agent.phase === "executed"
                                ? "w-1/2 bg-yellow-400"
                                : "w-0 bg-gray-300"
                    }`}
                  />
                </div>

                {/* Score or error */}
                <div className="mt-2 h-5">
                  {agent.status?.final_score != null && (
                    <p className="text-lg font-semibold text-gray-900">
                      {agent.status.final_score.toFixed(1)}
                      <span className="text-sm font-normal text-gray-400"> / 100</span>
                    </p>
                  )}
                  {agent.phase === "failed" && agent.status?.error_message && (
                    <p className="truncate text-xs text-red-600">{agent.status.error_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Score Summary */}
        {state === "done" && agents.some((a) => a.status?.final_score != null) && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-medium text-gray-900">Results</h2>
            <div className="mt-3 space-y-2">
              {agents
                .filter((a) => a.status?.final_score != null)
                .sort((a, b) => (b.status?.final_score ?? 0) - (a.status?.final_score ?? 0))
                .map((agent, i) => (
                  <div key={agent.info.id} className="flex items-center gap-3">
                    <span className="w-6 text-right text-sm font-medium text-gray-400">#{i + 1}</span>
                    <span className="w-32 text-sm text-gray-700">{agent.info.agentName}</span>
                    <div className="flex-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gray-900 transition-all duration-500"
                          style={{ width: `${agent.status?.final_score ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 text-right text-sm font-semibold text-gray-900">
                      {agent.status?.final_score?.toFixed(1)}
                    </span>
                  </div>
                ))}

              {agents.some((a) => a.phase === "failed") && (
                <div className="mt-2 border-t border-gray-100 pt-2">
                  {agents
                    .filter((a) => a.phase === "failed")
                    .map((agent) => (
                      <div key={agent.info.id} className="flex items-center gap-3">
                        <span className="w-6 text-right text-sm text-gray-400">--</span>
                        <span className="w-32 text-sm text-gray-400">{agent.info.agentName}</span>
                        <span className="text-xs text-red-500">Failed: {agent.status?.error_message}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
            <h2 className="mb-2 text-xs font-medium text-gray-400">Log</h2>
            <pre className="max-h-64 overflow-y-auto text-xs leading-relaxed text-gray-300">
              {log.join("\n")}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
