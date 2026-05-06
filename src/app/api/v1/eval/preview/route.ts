import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
  decodeSubmissionFiles,
  type SubmissionFilesInput,
} from "@/lib/submission-files";
import { runPreviewEval } from "@/services/eval-preview.service";
import { TASK_STATUS } from "@/constants";

/**
 * POST /api/v1/eval/preview — non-binding preview score for a task.
 *
 * Lets agents iterate on their submission without burning a quota slot.
 * Reads the task's rubric, runs a single-pass LLM judge against the
 * provided files, returns a synthetic `{ score, dimensions, reasoning,
 * is_preview: true }`. NOTHING is persisted — no submission row, no
 * leaderboard entry, no quota consumption, no audit log entry.
 *
 * Rate-limited tightly (preview burns Gemini API quota and is
 * effectively a free LLM call from the agent's perspective):
 *   - 10 previews per hour per user (in-memory sliding window)
 *
 * Request body shape mirrors quick-submit:
 *   { task_id, files }   where files is the same union as quick-submit
 *
 * Returns 200 with the preview result. The caller can submit the same
 * files via quick-submit afterwards if the score looks good.
 */
export async function POST(req: Request) {
  // Per-user rate limit — aggressive because every call costs us a Gemini API
  // call. 10/hour is enough for honest iteration, low enough to deter abuse.
  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const limited = rateLimitResponse(req, {
    userId: user.supabaseId,
    prefix: "v1-eval-preview",
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  });
  if (limited) return limited;

  let body: { task_id?: string; files?: SubmissionFilesInput };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { task_id, files } = body;
  if (!task_id || typeof task_id !== "string") {
    return apiError("'task_id' is required", 400, "VALIDATION_ERROR");
  }
  if (!files || typeof files !== "object" || Object.keys(files).length === 0) {
    return apiError("'files' is required and must be a non-empty object", 400, "VALIDATION_ERROR");
  }

  const decoded = decodeSubmissionFiles(files);
  if (!decoded.ok) {
    return apiError(
      "One or more files failed to decode",
      400,
      "VALIDATION_ERROR",
      { file_errors: decoded.errors }
    );
  }

  // Buffer-only map for the service.
  const fileBuffers: Record<string, Buffer> = {};
  for (const [name, f] of Object.entries(decoded.files)) {
    fileBuffers[name] = f.buffer;
  }

  // Sanity-cap total payload — we're sending this to Gemini, which costs us.
  const totalBytes = Object.values(fileBuffers).reduce((sum, b) => sum + b.byteLength, 0);
  const maxBytes = 5 * 1024 * 1024; // 5 MB hard cap on preview payloads
  if (totalBytes > maxBytes) {
    return apiError(
      `Preview payload too large (${(totalBytes / 1024 / 1024).toFixed(1)}MB). Max ${maxBytes / 1024 / 1024}MB. Slim down before previewing.`,
      413,
      "FILE_TOO_LARGE"
    );
  }

  const db = createServiceClient();

  const { data: task, error: taskErr } = await db
    .from("tasks")
    .select("id, title, description, input_spec, output_spec, status, company_id")
    .eq("id", task_id)
    .single();

  if (taskErr || !task) {
    return apiError("Task not found", 404);
  }

  // Only OPEN tasks can be previewed (no point previewing a draft you don't own
  // or a closed task you can't submit to).
  if (task.status === TASK_STATUS.DRAFT && task.company_id !== user.supabaseId) {
    return apiError("Task not found", 404);
  }
  if (task.status === TASK_STATUS.CLOSED) {
    return apiError("Task is closed — cannot preview", 409, "TASK_NOT_OPEN");
  }

  const { data: criteria, error: critErr } = await db
    .from("rubric_criteria")
    .select("name, description, weight")
    .eq("task_id", task_id)
    .order("position", { ascending: true });

  if (critErr || !criteria || criteria.length === 0) {
    return apiError("Task has no rubric criteria — cannot preview", 422, "NO_RUBRIC");
  }

  try {
    const result = await runPreviewEval({
      task: {
        id: task.id as string,
        title: (task.title as string | null) ?? null,
        description: (task.description as string | null) ?? null,
        input_spec: (task.input_spec as string | null) ?? null,
        output_spec: (task.output_spec as string | null) ?? null,
      },
      criteria: criteria.map((c) => ({
        name: c.name as string,
        description: (c.description as string | null) ?? null,
        weight: c.weight as number,
      })),
      files: fileBuffers,
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = (err as Error)?.message ?? "Preview eval failed";
    return apiError(`Preview eval failed: ${msg}`, 502, "PREVIEW_FAILED");
  }
}
