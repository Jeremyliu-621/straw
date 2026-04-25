import type { SupabaseClient } from "@supabase/supabase-js";
import {
  UPLOAD_STORAGE_BUCKET,
  UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS,
  UPLOAD_PRESIGNED_URL_MAX_TTL_SECONDS,
} from "@/constants";

/**
 * Generate a presigned upload URL for an upload-mode submission.
 *
 * The agent PUTs their artifact directly to Supabase Storage using this URL,
 * bypassing the Next.js API server for large files.
 *
 * Expiry returned to the client = min(Supabase's enforced TTL,
 * UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS, time_until_task_deadline).
 *
 * Note: Supabase's `createSignedUploadUrl` has no expiry parameter — the
 * URL is always valid for ~2h server-side. We don't lie about that here.
 * The real deadline gate is in the `/complete` and `/upload` endpoints.
 */
export async function generatePresignedUploadUrl(
  db: SupabaseClient,
  submissionId: string,
  deadlineIso?: string | null
): Promise<{ signedUrl: string; token: string; path: string; expiresAt: string }> {
  const storagePath = `submissions/${submissionId}/agent_output`;

  // Cap expiry to whichever comes first: our configured max,
  // Supabase's hard 2h ceiling, or the task deadline.
  let expirySeconds = Math.min(
    UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS,
    UPLOAD_PRESIGNED_URL_MAX_TTL_SECONDS
  );
  if (deadlineIso) {
    const deadlineMs = new Date(deadlineIso).getTime();
    const nowMs = Date.now();
    const secondsUntilDeadline = Math.floor((deadlineMs - nowMs) / 1000);
    if (secondsUntilDeadline > 0) {
      expirySeconds = Math.min(expirySeconds, secondsUntilDeadline);
    }
  }

  const { data, error } = await db.storage
    .from(UPLOAD_STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    throw new Error(`Failed to create presigned upload URL: ${error?.message ?? "unknown error"}`);
  }

  const expiresAt = new Date(Date.now() + expirySeconds * 1000).toISOString();

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    expiresAt,
  };
}

/**
 * Verify that an agent has uploaded files for a given submission.
 */
export async function verifyUploadExists(
  db: SupabaseClient,
  submissionId: string
): Promise<boolean> {
  const { data, error } = await db.storage
    .from(UPLOAD_STORAGE_BUCKET)
    .list(`submissions/${submissionId}`);

  if (error) {
    throw new Error(`Failed to verify upload: ${error.message}`);
  }

  // Filter out placeholder entries (zero-byte .emptyFolderPlaceholder files)
  const realFiles = (data ?? []).filter(
    (f) => f.name !== ".emptyFolderPlaceholder" && (f.metadata?.size ?? 0) > 0
  );

  return realFiles.length > 0;
}

/**
 * Verify that the uploaded submission contains a SUBMISSION.md file.
 * Returns true if found, false otherwise.
 */
export async function verifySubmissionMd(
  db: SupabaseClient,
  submissionId: string
): Promise<boolean> {
  const { data, error } = await db.storage
    .from(UPLOAD_STORAGE_BUCKET)
    .list(`submissions/${submissionId}`);

  if (error) {
    throw new Error(`Failed to check SUBMISSION.md: ${error.message}`);
  }

  // Case-insensitive match so "submission.md" / "Submission.md" also pass.
  return (data ?? []).some((f) => f.name.toLowerCase() === "submission.md");
}

/**
 * Get the canonical storage path for a submission's output.
 */
export function getSubmissionStoragePath(submissionId: string): string {
  return `submissions/${submissionId}`;
}
