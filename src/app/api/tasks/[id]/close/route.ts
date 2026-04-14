import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { closeExpiredTask } from "@/services/task-close.service";
import { apiError, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req, { prefix: "task-close", maxRequests: 10 });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const uuidError = validateUuid(id, "task ID");
  if (uuidError) return uuidError;

  // Verify ownership
  const db = createServiceClient();
  const { data: task } = await db
    .from("tasks")
    .select("id, company_id")
    .eq("id", id)
    .single();

  if (!task) {
    return apiError("Task not found", 404);
  }
  if (task.company_id !== user.supabaseId) {
    return apiError("Not your task", 403);
  }

  const result = await closeExpiredTask(id);

  if (result.error) {
    return apiError(result.error, 400);
  }

  return NextResponse.json({ closed: result.closed });
}
