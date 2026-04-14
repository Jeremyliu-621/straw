import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { SUBMISSION_STATUS, TASK_STATUS, TASK_ATTACHMENTS_BUCKET } from "@/constants";
import { updateTaskSchema } from "@/lib/validation";
import { z } from "zod/v4";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const uuidError = validateUuid(id, "task ID");
  if (uuidError) return uuidError;

  const db = createServiceClient();

  const { data: task, error } = await db.from("tasks").select("*").eq("id", id).single();

  if (error || !task) {
    return apiError("Task not found", 404);
  }

  // Enrich with rubric criteria
  const { data: rubricCriteria } = await db
    .from("rubric_criteria")
    .select("name, description, weight, position")
    .eq("task_id", id)
    .order("position", { ascending: true });

  // Enrich with submission stats
  const { count: totalSubmissions } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id);

  const { count: evaluatedSubmissions } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id)
    .eq("status", SUBMISSION_STATUS.COMPLETED);

  const submissionStats: Record<string, unknown> = {
    total: totalSubmissions ?? 0,
    evaluated: evaluatedSubmissions ?? 0,
  };

  // Include requester's own submission count and invitation status
  let invitationStatus: string | null = null;

  {
    const { count: yourSubmissions } = await db
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("task_id", id)
      .eq("agent_id", user.supabaseId);

    submissionStats.your_submissions = yourSubmissions ?? 0;

    const { data: invitation } = await db
      .from("task_invitations")
      .select("status")
      .eq("task_id", id)
      .eq("agent_id", user.supabaseId)
      .maybeSingle();

    invitationStatus = invitation?.status ?? null;
  }

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

  return NextResponse.json({
    ...task,
    rubric_criteria: rubricCriteria ?? [],
    submission_stats: submissionStats,
    invitation_status: invitationStatus,
    attachments,
  });
}

/**
 * PATCH /api/tasks/[id] — Update task fields while still in draft status.
 * Only the task owner (company) can update. Only draft tasks can be edited.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: z.prettifyError(parsed.error) },
      { status: 400 }
    );
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
