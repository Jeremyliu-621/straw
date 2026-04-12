import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { ROLE_COMPANY } from "@/constants";
import { z } from "zod/v4";

const TEST_SUITE_BUCKET = "test-suites";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// ── Test suite JSON schema ────────────────────────────────────

const testCaseSchema = z.object({
  name: z.string().min(1, "Test case name is required"),
  input: z.string(),
  expected_output: z.string().min(1, "Expected output is required"),
  match_type: z.enum(["exact", "contains", "regex"]),
});

const testSuiteSchema = z.object({
  test_cases: z
    .array(testCaseSchema)
    .min(1, "Test suite must have at least one test case"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== ROLE_COMPANY) {
    return NextResponse.json({ error: "Only companies can upload test suites" }, { status: 403 });
  }

  const { id: taskId } = await params;
  const db = createServiceClient();

  // Verify task exists and belongs to this company
  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("id, company_id, status")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.company_id !== session.user.supabaseId) {
    return NextResponse.json({ error: "Not your task" }, { status: 403 });
  }

  // Only allow upload on draft tasks (can't change test suite after publishing)
  if (task.status !== "draft") {
    return NextResponse.json(
      { error: "Test suite can only be set on draft tasks" },
      { status: 400 }
    );
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.name.endsWith(".json")) {
    return NextResponse.json({ error: "File must be a .json file" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File size must be under 5MB" },
      { status: 400 }
    );
  }

  // Read and validate JSON
  let parsed: z.infer<typeof testSuiteSchema>;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const result = testSuiteSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid test suite format",
          details: z.prettifyError(result.error),
        },
        { status: 400 }
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "File is not valid JSON" }, { status: 400 });
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
    console.error("[test-suite] Upload failed:", uploadError);
    return NextResponse.json({ error: "Failed to upload test suite" }, { status: 500 });
  }

  // Update task with storage path
  const { error: updateError } = await db
    .from("tasks")
    .update({ test_suite_url: storagePath })
    .eq("id", taskId);

  if (updateError) {
    console.error("[test-suite] Failed to update task:", updateError);
    return NextResponse.json({ error: "Failed to save test suite reference" }, { status: 500 });
  }

  return NextResponse.json({
    path: storagePath,
    test_case_count: parsed.test_cases.length,
  });
}
