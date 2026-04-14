import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { rubricCriterionSchema } from "@/lib/validation";
import { TASK_STATUS, RUBRIC_MIN_CRITERIA, RUBRIC_MAX_CRITERIA, RUBRIC_WEIGHT_SUM } from "@/constants";
import { apiError, parseBody, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod/v4";

const updateRubricSchema = z.object({
  criteria: z
    .array(rubricCriterionSchema)
    .min(RUBRIC_MIN_CRITERIA, `At least ${RUBRIC_MIN_CRITERIA} criterion is required`)
    .max(RUBRIC_MAX_CRITERIA, `At most ${RUBRIC_MAX_CRITERIA} criteria allowed`),
}).refine(
  (data) => {
    const totalWeight = data.criteria.reduce((sum, c) => sum + c.weight, 0);
    return totalWeight === RUBRIC_WEIGHT_SUM;
  },
  {
    message: `Rubric criteria weights must sum to ${RUBRIC_WEIGHT_SUM}`,
    path: ["criteria"],
  }
);

/**
 * PUT /api/v1/tasks/[id]/rubric — Replace rubric criteria for a draft task.
 *
 * Company-only. Atomic replacement (deletes old criteria, inserts new ones).
 * Criteria weights must sum to 100.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req, { prefix: "v1-rubric-update", maxRequests: 10 });
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
    return apiError("Rubric can only be updated on draft tasks", 409);
  }

  const result = await parseBody(req);
  if ("error" in result) return result.error;

  const parsed = updateRubricSchema.safeParse(result.data);
  if (!parsed.success) {
    return apiError("Validation failed", 400, "VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const { criteria } = parsed.data;

  // Atomic replacement: delete old, insert new
  const { error: deleteError } = await db
    .from("rubric_criteria")
    .delete()
    .eq("task_id", id);

  if (deleteError) {
    return apiError("Failed to clear existing rubric", 500);
  }

  const rubricRows = criteria.map((c) => ({
    task_id: id,
    name: c.name,
    description: c.description ?? null,
    weight: c.weight,
    position: c.position,
  }));

  const { data: inserted, error: insertError } = await db
    .from("rubric_criteria")
    .insert(rubricRows)
    .select();

  if (insertError) {
    return apiError("Failed to create rubric criteria", 500);
  }

  return NextResponse.json({ criteria: inserted });
}
