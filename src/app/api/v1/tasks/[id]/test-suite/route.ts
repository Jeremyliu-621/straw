import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { testSuiteSchema } from "@/lib/validation";
import { TEST_SUITE_BUCKET, TEST_SUITE_MAX_FILE_SIZE_BYTES, TASK_STATUS } from "@/constants";
import { apiError, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod/v4";

/**
 * POST /api/v1/tasks/[id]/test-suite — Upload test suite JSON for a draft task.
 *
 * Company-only. Accepts multipart form-data with a 'file' field (.json, max 5MB).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = rateLimitResponse(req, { prefix: "v1-test-suite", maxRequests: 10 });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id: taskId } = await params;
  const uuidErr = validateUuid(taskId, "task ID");
  if (uuidErr) return uuidErr;

  const db = createServiceClient();

  // Verify task exists and belongs to this company
  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("id, company_id, status")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return apiError("Task not found", 404);
  }

  if (task.company_id !== user.supabaseId) {
    return apiError("Not your task", 403);
  }

  if (task.status !== TASK_STATUS.DRAFT) {
    return apiError("Test suite can only be set on draft tasks", 400);
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid form data", 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return apiError("No file provided", 400);
  }

  if (!file.name.endsWith(".json")) {
    return apiError("File must be a .json file", 400);
  }

  if (file.size > TEST_SUITE_MAX_FILE_SIZE_BYTES) {
    return apiError("File size must be under 5MB", 400);
  }

  // Read and validate JSON
  let parsed: z.infer<typeof testSuiteSchema>;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const result = testSuiteSchema.safeParse(json);
    if (!result.success) {
      return apiError("Invalid test suite format", 400, "VALIDATION_ERROR", z.prettifyError(result.error));
    }
    parsed = result.data;
  } catch {
    return apiError("File is not valid JSON", 400);
  }

  // Upload to Supabase Storage
  const storagePath = `tasks/${taskId}/suite.json`;
  const fileBytes = new TextEncoder().encode(JSON.stringify(parsed, null, 2));

  const { error: uploadError } = await db.storage
    .from(TEST_SUITE_BUCKET)
    .upload(storagePath, fileBytes, {
      contentType: "application/json",
      upsert: true,
    });

  if (uploadError) {
    console.error("[v1/test-suite] Upload failed:", uploadError);
    return apiError("Failed to upload test suite", 500);
  }

  // Update task with storage path
  const { error: updateError } = await db
    .from("tasks")
    .update({ test_suite_url: storagePath })
    .eq("id", taskId);

  if (updateError) {
    console.error("[v1/test-suite] Failed to update task:", updateError);
    return apiError("Failed to save test suite reference", 500);
  }

  return NextResponse.json({
    path: storagePath,
    test_case_count: parsed.test_cases.length,
  });
}
