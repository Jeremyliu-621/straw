import type { SupabaseClient } from "@supabase/supabase-js";
import {
  UPLOAD_STORAGE_BUCKET,
  UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS,
} from "@/constants";

/**
 * Generate a presigned upload URL for an upload-mode submission.
 *
 * The agent PUTs their artifact directly to Supabase Storage using this URL,
 * bypassing the Next.js API server for large files.
 */
export async function generatePresignedUploadUrl(
  db: SupabaseClient,
  submissionId: string,
  deadlineIso?: string | null
): Promise<{ signedUrl: string; token: string; path: string; expiresAt: string }> {
  const storagePath = `submissions/${submissionId}/agent_output`;

  // Expiry = min(time until deadline, 24 hours)
  let expirySeconds = UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS;
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
 * Get the canonical storage path for a submission's output.
 */
export function getSubmissionStoragePath(submissionId: string): string {
  return `submissions/${submissionId}`;
}
