import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
  TASK_ATTACHMENTS_BUCKET,
  TASK_MAX_ATTACHMENT_SIZE_MB,
  TASK_MAX_ATTACHMENTS,
} from "@/constants";

// ── File validation ─────────────────────────────────────────

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  ".csv": ["text/csv"],
  ".json": ["application/json"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".pdf": ["application/pdf"],
  ".txt": ["text/plain"],
};

const VALID_FIELDS = new Set(["description", "input_spec", "output_spec"]);

const MAX_BYTES = TASK_MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\0/g, "") // null bytes
    .replace(/[/\\:*?"<>|]/g, "_") // path separators + special chars
    .replace(/\.{2,}/g, ".") // double dots (path traversal)
    .slice(0, 200); // length cap
}

function isAllowedFile(filename: string, mimeType: string): boolean {
  const ext = getExtension(filename);
  const allowedMimes = ALLOWED_EXTENSIONS[ext];
  if (!allowedMimes) return false;
  // Accept if MIME matches or is empty/octet-stream (browsers sometimes mis-report)
  if (!mimeType || mimeType === "application/octet-stream") return true;
  return allowedMimes.includes(mimeType);
}

// ── Helpers ─────────────────────────────────────────────────

async function getAttachmentsWithUrls(
  db: ReturnType<typeof createServiceClient>,
  taskId: string
) {
  const { data: attachments, error } = await db
    .from("task_attachments")
    .select("id, task_id, field, filename, storage_path, file_size, content_type, description, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) return { data: null, error };

  const withUrls = await Promise.all(
    (attachments ?? []).map(async (att) => {
      const { data: urlData } = await db.storage
        .from(TASK_ATTACHMENTS_BUCKET)
        .createSignedUrl(att.storage_path, 3600); // 1 hour

      return {
        id: att.id,
        field: att.field,
        filename: att.filename,
        file_size: att.file_size,
        content_type: att.content_type,
        description: att.description,
        download_url: urlData?.signedUrl ?? null,
        created_at: att.created_at,
      };
    })
  );

  return { data: withUrls, error: null };
}

// ── GET /api/tasks/[id]/attachments ─────────────────────────

/**
 * List all attachments for a task with signed download URLs.
 * Any authenticated user can read attachments for non-draft tasks.
 * Task owner can always read their own attachments.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // Verify task exists
  const { data: task } = await db
    .from("tasks")
    .select("id, company_id, status")
    .eq("id", id)
    .single();

  if (!task) {
    return apiError("Task not found", 404);
  }

  // Draft attachments only visible to owner
  if (task.status === "draft" && task.company_id !== user.supabaseId) {
    return apiError("Task not found", 404);
  }

  const { data, error } = await getAttachmentsWithUrls(db, id);
  if (error) {
    return apiError("Failed to fetch attachments", 500);
  }

  return NextResponse.json(data);
}

// ── POST /api/tasks/[id]/attachments ────────────────────────

/**
 * Upload a file attachment to a task.
 * Company-only (task owner). No status restriction — upload any time.
 *
 * Multipart form data:
 * - file: the file to upload (required)
 * - field: "description" | "input_spec" | "output_spec" (required)
 * - description: text description of the file (optional)
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req, { prefix: "attachment-upload", maxRequests: 10 });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id: taskId } = await params;
  const uuidErr = validateUuid(taskId, "task ID");
  if (uuidErr) return uuidErr;

  const db = createServiceClient();

  // Verify task exists and user owns it
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

  // Check attachment count limit
  const { count } = await db
    .from("task_attachments")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId);

  if ((count ?? 0) >= TASK_MAX_ATTACHMENTS) {
    return apiError(`Maximum ${TASK_MAX_ATTACHMENTS} attachments per task`, 400, "ATTACHMENT_LIMIT");
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid form data", 400);
  }

  const file = formData.get("file");
  const field = formData.get("field");
  const description = formData.get("description");

  if (!file || !(file instanceof File)) {
    return apiError("No file provided", 400);
  }

  if (!field || typeof field !== "string" || !VALID_FIELDS.has(field)) {
    return apiError('Field must be "description", "input_spec", or "output_spec"', 400);
  }

  // ── Security validations ──────────────────────────────────

  // File size
  if (file.size > MAX_BYTES) {
    return apiError(`File exceeds ${TASK_MAX_ATTACHMENT_SIZE_MB}MB limit`, 400, "FILE_TOO_LARGE");
  }

  if (file.size === 0) {
    return apiError("File is empty", 400);
  }

  // File type — validate extension AND MIME type
  if (!isAllowedFile(file.name, file.type)) {
    const allowedExts = Object.keys(ALLOWED_EXTENSIONS).join(", ");
    return apiError(`Unsupported file type. Allowed: ${allowedExts}`, 400, "UNSUPPORTED_FILE_TYPE");
  }

  // Sanitize filename
  const safeName = sanitizeFilename(file.name);
  if (!safeName || safeName === "." || safeName === "..") {
    return apiError("Invalid filename", 400);
  }

  // ── Upload to Storage ─────────────────────────────────────

  const timestamp = Date.now();
  const storagePath = `tasks/${taskId}/${field}/${timestamp}_${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await db.storage
    .from(TASK_ATTACHMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("[attachments] Upload failed:", uploadError);
    return apiError("Failed to upload file", 500);
  }

  // ── Insert DB record ──────────────────────────────────────

  const { data: attachment, error: insertError } = await db
    .from("task_attachments")
    .insert({
      task_id: taskId,
      field,
      filename: file.name,
      storage_path: storagePath,
      file_size: file.size,
      content_type: file.type || "application/octet-stream",
      description: typeof description === "string" ? description : "",
    })
    .select()
    .single();

  if (insertError) {
    console.error("[attachments] DB insert failed:", insertError);
    // Clean up storage on DB failure
    await db.storage.from(TASK_ATTACHMENTS_BUCKET).remove([storagePath]);
    return apiError("Failed to save attachment record", 500);
  }

  // Generate signed download URL
  const { data: urlData } = await db.storage
    .from(TASK_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json(
    {
      id: attachment.id,
      field: attachment.field,
      filename: attachment.filename,
      file_size: attachment.file_size,
      content_type: attachment.content_type,
      description: attachment.description,
      download_url: urlData?.signedUrl ?? null,
      created_at: attachment.created_at,
    },
    { status: 201 }
  );
}
