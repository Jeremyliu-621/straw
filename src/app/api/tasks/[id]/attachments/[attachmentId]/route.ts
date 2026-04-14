import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { TASK_ATTACHMENTS_BUCKET } from "@/constants";

/**
 * DELETE /api/tasks/[id]/attachments/[attachmentId] — Remove an attachment.
 *
 * Company-only (task owner). Deletes from both Storage and database.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id: taskId, attachmentId } = await params;
  const taskErr = validateUuid(taskId, "task ID");
  if (taskErr) return taskErr;
  const attErr = validateUuid(attachmentId, "attachment ID");
  if (attErr) return attErr;

  const db = createServiceClient();

  // Verify task ownership
  const { data: task } = await db
    .from("tasks")
    .select("id, company_id")
    .eq("id", taskId)
    .single();

  if (!task) {
    return apiError("Task not found", 404);
  }
  if (task.company_id !== user.supabaseId) {
    return apiError("Not your task", 403);
  }

  // Fetch attachment record
  const { data: attachment } = await db
    .from("task_attachments")
    .select("id, storage_path")
    .eq("id", attachmentId)
    .eq("task_id", taskId)
    .single();

  if (!attachment) {
    return apiError("Attachment not found", 404);
  }

  // Delete from Storage
  await db.storage
    .from(TASK_ATTACHMENTS_BUCKET)
    .remove([attachment.storage_path]);

  // Delete DB record
  const { error: deleteError } = await db
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId);

  if (deleteError) {
    console.error("[attachments] DB delete failed:", deleteError);
    return apiError("Failed to delete attachment", 500);
  }

  return new Response(null, { status: 204 });
}
