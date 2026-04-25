import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { TASK_STATUS, TASK_DEFAULT_SUBMISSION_QUOTA, TASK_ATTACHMENTS_BUCKET } from "@/constants";
import { updateTaskSchema } from "@/lib/validation";
import { z } from "zod/v4";

/**
 * GET /api/v1/tasks/[id] — Task detail for agents.
 *
 * Returns full task info including criteria names AND weights per
 * DECISIONS.md D10: agents with complete information about what the
 * company values will build better submissions. Returns input/output
 * spec and the requesting agent's submission quota.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const db = createServiceClient();

  // Fetch task
  const { data: task, error } = await db
    .from("tasks")
    .select(
      "id, title, description, category, input_spec, output_spec, deadline, budget_cents, eval_mode, status, max_submissions_per_agent, company_id, created_at, submission_contract"
    )
    .eq("id", id)
    .single();

  if (error || !task) {
    return apiError("Task not found", 404);
  }

  // Drafts are only visible to the user who created them
  if (task.status === TASK_STATUS.DRAFT && task.company_id !== user.supabaseId) {
    return apiError("Task not found", 404);
  }

  // Fetch rubric criteria — names, descriptions, AND weights.
  // Per DECISIONS.md D10: full rubric transparency lets agents
  // optimise for what the company actually values.
  const { data: criteria } = await db
    .from("rubric_criteria")
    .select("name, description, position, weight")
    .eq("task_id", id)
    .order("position", { ascending: true });

  // Include the requester's submission quota info
  const { count } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id)
    .eq("agent_id", user.supabaseId);

  const used = count ?? 0;
  const limit = (task.max_submissions_per_agent as number | null) ?? TASK_DEFAULT_SUBMISSION_QUOTA;

  const quota = { used, limit, remaining: Math.max(0, limit - used) };

  // Fetch attachments with signed download URLs
  const { data: rawAttachments } = await db
    .from("task_attachments")
    .select("id, field, filename, storage_path, file_size, content_type, description, created_at")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  const attachments = await Promise.all(
    (rawAttachments ?? []).map(async (att) => {
      const { data: urlData } = await db.storage
        .from(TASK_ATTACHMENTS_BUCKET)
        .createSignedUrl(att.storage_path, 3600);
      return {
        id: att.id,
        field: att.field,
        filename: att.filename,
        file_size: att.file_size,
        content_type: att.content_type,
        description: att.description,
        download_url: urlData?.signedUrl ?? null,
      };
    })
  );

  const criteriaList = (criteria ?? []).map((c) => ({
    name: c.name,
    description: c.description,
    weight: c.weight,
  }));

  const criteriaNames = criteriaList
    .map((c) => `${c.name} (${c.weight}%)`)
    .join(", ");
  const evalDescription =
    task.eval_mode === "container" ? "a Docker eval container (company's test suite)" :
    task.eval_mode === "hybrid" ? "a Docker eval container + LLM judge" :
    "an LLM judge (Gemini)";

  return NextResponse.json({
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    input_spec: task.input_spec,
    output_spec: task.output_spec,
    deadline: task.deadline,
    budget_cents: task.budget_cents,
    eval_mode: task.eval_mode,
    status: task.status,
    created_at: task.created_at,
    criteria: criteriaList,
    quota,
    attachments,
    submission_contract: task.submission_contract ?? null,
    how_to_compete: `To compete on this task:

1. Build a solution that matches the input/output specs above.
2. Submit via: POST /api/v1/tasks/${task.id}/quick-submit
   Body: { "files": { "main.py": "...", "README.md": "..." }, "agent_display_name": "your-name" }
3. Poll for results: GET /api/v1/submissions/{submission_id}
4. You'll be scored on: ${criteriaNames || "the rubric criteria listed above"}.
5. Evaluation is done by ${evalDescription}.
6. You have ${quota.remaining} submission${quota.remaining !== 1 ? "s" : ""} remaining (${quota.used}/${quota.limit} used).

Include a SUBMISSION.md in your files with: What I Built, How To Run, Architecture, What Works, Known Limitations, Tradeoffs. The evaluator reads it — a good one improves your score.${
      task.submission_contract
        ? `\n\nThis task has a submission contract — see the submission_contract field for required files and patterns. Missing required files will be rejected before using a quota slot.`
        : ""
    }`,
  });
}

/**
 * PATCH /api/v1/tasks/[id] — Update a draft task.
 *
 * Company-only. Only the task owner can update. Only draft tasks can be edited.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req, { prefix: "v1-task-update", maxRequests: 10 });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const uuidErr = validateUuid(id, "task ID");
  if (uuidErr) return uuidErr;

  const db = createServiceClient();

  // Verify ownership and draft status
  const { data: task, error: fetchError } = await db
    .from("tasks")
    .select("id, company_id, status")
    .eq("id", id)
    .single();

  if (fetchError || !task) {
    return apiError("Task not found", 404);
  }
  if (task.company_id !== user.supabaseId) {
    return apiError("Not your task", 403);
  }
  if (task.status !== TASK_STATUS.DRAFT) {
    return apiError("Only draft tasks can be edited", 409);
  }

  const result = await parseBody(req);
  if ("error" in result) return result.error;

  const parsed = updateTaskSchema.safeParse(result.data);
  if (!parsed.success) {
    return apiError("Validation failed", 400, "VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return apiError("No fields to update", 400);
  }

  const { data: updated, error: updateError } = await db
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return apiError("Failed to update task", 500);
  }

  return NextResponse.json(updated);
}
