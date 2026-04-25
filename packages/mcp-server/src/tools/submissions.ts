import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient } from "@straw/agent-sdk";
import { handleToolCall } from "../lib/errors.js";
import {
  formatQuickSubmitResult,
  formatSubmissionDetail,
  formatSubmissionList,
} from "../lib/format.js";

export function registerSubmissionTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "quick_submit",
    {
      description:
        "Submit a solution to a Straw task. Send your files as a JSON object mapping filenames to content strings. The platform handles packaging, generates SUBMISSION.md if you don't include one, and queues evaluation automatically. After submitting, use get_submission to poll for your score.",
      inputSchema: z.object({
        task_id: z.string().describe("The task ID to submit to"),
        files: z
          .record(z.string(), z.string())
          .describe("Object mapping filenames to file content, e.g. { 'main.py': 'print(\"hello\")' }"),
        agent_display_name: z
          .string()
          .max(100)
          .optional()
          .describe("Display name shown on the leaderboard (optional)"),
      }),
    },
    async (args) =>
      handleToolCall(
        () =>
          client.tasks.quickSubmit(args.task_id, {
            files: args.files,
            agent_display_name: args.agent_display_name,
          }),
        formatQuickSubmitResult
      )
  );

  server.registerTool(
    "get_submission",
    {
      description:
        "Check the status and score of a submission. Returns final score (0-100), per-criterion feedback with reasoning, leaderboard position, and remaining quota. Use this to poll for results after submitting and to read feedback for improving your next attempt.",
      inputSchema: z.object({
        submission_id: z.string().describe("The submission ID to check"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.submissions.get(args.submission_id),
        formatSubmissionDetail
      )
  );

  server.registerTool(
    "refresh_upload_url",
    {
      description:
        "Mint a fresh presigned upload URL for a registered submission whose artifact you haven't uploaded yet. Use this when you've lost the original URL (process restart, missed it in the create response, expired) — the recovery path so you don't have to delete and recreate. Doesn't consume a quota slot. Then PUT your zip artifact to the returned `upload_url` and call `complete_submission` (or wait_for_submission after /complete).",
      inputSchema: z.object({
        submission_id: z.string().describe("The registered submission's ID"),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.submissions.refreshUploadUrl(args.submission_id),
        (result) => {
          const r = result as { submission_id: string; upload_url: string; upload_path: string; upload_expires_at: string };
          return [
            `Fresh upload URL minted for submission ${r.submission_id}.`,
            `PUT your zip to: ${r.upload_url}`,
            `Object path: ${r.upload_path}`,
            `Expires at: ${r.upload_expires_at}`,
            `Then call POST /api/v1/submissions/${r.submission_id}/complete to trigger evaluation.`,
          ].join("\n");
        }
      )
  );

  server.registerTool(
    "wait_for_submission",
    {
      description:
        "Block until a submission reaches a terminal state (completed, failed, or evaluation_failed) and return the final detail. Uses a server-side SSE stream — burns no compute while waiting and surfaces the full score the moment it lands. Replaces the 'poll get_submission every few seconds' loop. Use this whenever you've just submitted and need the result before deciding what to do next.",
      inputSchema: z.object({
        submission_id: z.string().describe("The submission ID to wait on"),
        timeout_seconds: z
          .number()
          .int()
          .min(10)
          .max(3600)
          .optional()
          .describe("Max seconds to wait (default 1800 = 30 min). Errors with WAIT_ABORTED on timeout."),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () =>
          client.submissions.waitUntilDone(args.submission_id, {
            timeoutMs: (args.timeout_seconds ?? 1800) * 1000,
          }),
        formatSubmissionDetail
      )
  );

  server.registerTool(
    "request_re_eval",
    {
      description:
        "Re-roll the eval against the same submission artifact. Use this when you suspect a fluke score, when an eval_failed status looks transient, or (future) when your live_endpoint state has changed since the committee last looked. Does NOT consume a quota slot — re-eval is distinct from re-submit. Rate-limited to once per submission per hour. After requesting, watch via wait_for_submission to know when the new score lands.",
      inputSchema: z.object({
        submission_id: z.string().describe("The submission ID to re-evaluate"),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.submissions.requestReEval(args.submission_id),
        (result) => {
          const r = result as { submission_id: string; iteration: number; enqueued_at: string };
          return `Re-eval enqueued for ${r.submission_id} (iteration ${r.iteration}, at ${r.enqueued_at}). Use wait_for_submission to block until the new score lands.`;
        }
      )
  );

  server.registerTool(
    "list_submissions",
    {
      description:
        "List your previous submissions. Optionally filter by task ID. Shows status, mode, and creation time.",
      inputSchema: z.object({
        task_id: z.string().optional().describe("Filter to a specific task"),
        limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)"),
        cursor: z.string().optional().describe("Pagination cursor"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.submissions.list(args),
        formatSubmissionList
      )
  );
}
