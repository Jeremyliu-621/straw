import type { SupabaseClient } from "@supabase/supabase-js";
import AdmZip from "adm-zip";
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

// ── Zip extraction (D29 — fix for presigned-URL upload bug) ──

/**
 * The presigned-URL flow + the explicit /upload route both store the agent
 * artifact as a single blob at `submissions/${id}/agent_output`. The
 * downstream verifier (`verifySubmissionMd`) and the eval worker
 * (`fetchAgentOutput`) both list the directory expecting LOOSE FILES with
 * recognizable names like `SUBMISSION.md`, `main.py`, etc. The two flows
 * silently disagreed: every zip-based submission failed
 * `MISSING_SUBMISSION_MD` even when the zip contained it at the root.
 *
 * The fix: after the artifact lands at `agent_output`, detect if it's a
 * zip; if so, extract its entries and re-upload each as a loose file in
 * the same directory. Then delete the original blob. Downstream code
 * (verifier + eval worker) sees the loose-file shape it was always
 * designed for. This unifies all three upload paths (quick-submit /
 * presigned URL / /upload) into the same loose-file Storage shape.
 *
 * Limits: caps extracted-file count + total-extracted-size to bound the
 * cost of malicious or pathological zips. Rejects path-traversal in
 * entry names.
 */

/** Max entries we'll extract from a single zip. */
const ZIP_MAX_ENTRIES = 1_000;
/** Max total uncompressed bytes across all entries (defense vs zip bombs). */
const ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES = 500 * 1024 * 1024; // 500 MB

export type ExtractAgentOutputResult =
  | { kind: "extracted"; files_written: number; bytes_written: number }
  | { kind: "not_a_zip" }
  | { kind: "no_blob" }
  | { kind: "too_many_entries"; count: number; limit: number }
  | { kind: "too_large"; bytes: number; limit: number }
  | { kind: "unsafe_path"; path: string }
  | { kind: "storage_error"; reason: string };

function isZipMagic(buf: Buffer): boolean {
  // Local file header (`PK\x03\x04`), empty archive (`PK\x05\x06`), or
  // spanned archive header (`PK\x07\x08`).
  if (buf.length < 4) return false;
  return (
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)
  );
}

function isSafeRelativePath(p: string): boolean {
  if (!p) return false;
  if (p.startsWith("/")) return false;
  if (p.includes("\\")) return false;
  // Reject any segment that is .., even nested: 'a/../b'.
  return !p.split("/").some((seg) => seg === "..");
}

/**
 * Drop entries that come from common archive-tool noise: macOS resource forks
 * (`__MACOSX/`, `.DS_Store`) and Windows thumbnail caches (`Thumbs.db`).
 * These would otherwise pollute the extracted files and confuse the LLM judge.
 */
function isArchiveNoise(entryName: string): boolean {
  if (entryName.startsWith("__MACOSX/") || entryName.includes("/__MACOSX/")) return true;
  const base = entryName.split("/").pop() ?? "";
  return base === ".DS_Store" || base === "Thumbs.db";
}

/**
 * If every entry shares a single top-level directory prefix, return that
 * prefix (e.g. `"myproj/"`). Returns null otherwise. Rescues the very common
 * "right-clicked a folder and zipped it" mistake where SUBMISSION.md ends up
 * at `myproj/SUBMISSION.md` instead of the archive root — without that fix
 * the verifier would (correctly per its own contract) report MISSING_SUBMISSION_MD.
 */
function findCommonRootPrefix(entryNames: string[]): string | null {
  if (entryNames.length === 0) return null;
  const firstSlash = entryNames[0].indexOf("/");
  if (firstSlash <= 0) return null;
  const candidate = entryNames[0].slice(0, firstSlash + 1);
  return entryNames.every((n) => n.startsWith(candidate)) ? candidate : null;
}

/**
 * Exposed for direct unit testing of the path-traversal guard. AdmZip
 * auto-sanitizes names at construction time, so building a malicious zip
 * through it doesn't exercise this check — but real zips constructed by
 * other tools (or hand-crafted) absolutely can carry `..` segments. The
 * production `extractAgentOutputZip` always calls this on every entry.
 */
export const __upload_testing__ = { isZipMagic, isSafeRelativePath, isArchiveNoise, findCommonRootPrefix };

/**
 * If `submissions/${id}/agent_output` is a zip, extract its entries to
 * loose files in the same directory and delete the original blob. Idempotent
 * for the loose-files case (returns `not_a_zip`/`no_blob`). Bounded by
 * ZIP_MAX_ENTRIES + ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES.
 */
export async function extractAgentOutputZip(
  db: SupabaseClient,
  submissionId: string
): Promise<ExtractAgentOutputResult> {
  const dirPath = `submissions/${submissionId}`;
  const blobPath = `${dirPath}/agent_output`;

  const { data: blob, error: dlError } = await db.storage
    .from(UPLOAD_STORAGE_BUCKET)
    .download(blobPath);

  if (dlError || !blob) {
    // No agent_output blob → likely the loose-file path (quick_submit) or
    // nothing uploaded yet. Either way, nothing to extract.
    return { kind: "no_blob" };
  }

  const buf = Buffer.from(await blob.arrayBuffer());
  if (!isZipMagic(buf)) {
    return { kind: "not_a_zip" };
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(buf);
  } catch (err) {
    return { kind: "storage_error", reason: `zip parse failed: ${(err as Error).message}` };
  }

  const allEntries = zip.getEntries().filter((e) => !e.isDirectory);
  // Drop archive-tool noise (__MACOSX, .DS_Store, Thumbs.db) before we count
  // entries or compute the common-root prefix — otherwise __MACOSX would mask
  // legitimate single-root zips.
  const entries = allEntries.filter((e) => !isArchiveNoise(e.entryName));
  if (entries.length > ZIP_MAX_ENTRIES) {
    return { kind: "too_many_entries", count: entries.length, limit: ZIP_MAX_ENTRIES };
  }

  let totalBytes = 0;
  for (const e of entries) {
    totalBytes += e.header.size;
  }
  if (totalBytes > ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES) {
    return { kind: "too_large", bytes: totalBytes, limit: ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES };
  }

  // Auto-strip a single common top-level directory if all entries share one.
  // Real-daemon audit (2026-04-25) flagged the common "right-clicked a folder
  // and zipped it" mistake — SUBMISSION.md ended up at `myproj/SUBMISSION.md`
  // and the verifier (correctly, per its own contract) failed with
  // MISSING_SUBMISSION_MD. Stripping is harmless: if the user genuinely
  // wanted a `myproj/` subdir preserved, they'd have at least one sibling
  // entry at the root (most commonly SUBMISSION.md itself).
  const commonRoot = findCommonRootPrefix(entries.map((e) => e.entryName));

  let filesWritten = 0;
  let bytesWritten = 0;

  for (const entry of entries) {
    const stripped = commonRoot
      ? entry.entryName.slice(commonRoot.length)
      : entry.entryName;
    if (!stripped) continue; // entry was the bare directory marker
    if (!isSafeRelativePath(stripped)) {
      return { kind: "unsafe_path", path: stripped };
    }
    const data = entry.getData();
    const dest = `${dirPath}/${stripped}`;
    const { error: upErr } = await db.storage
      .from(UPLOAD_STORAGE_BUCKET)
      .upload(dest, data, {
        upsert: true,
        contentType: "application/octet-stream",
      });
    if (upErr) {
      return { kind: "storage_error", reason: `upload failed for ${stripped}: ${upErr.message}` };
    }
    filesWritten += 1;
    bytesWritten += data.length;
  }

  // Delete the original blob — Storage list/verifier/eval-worker now see
  // only the loose extracted files.
  const { error: rmErr } = await db.storage.from(UPLOAD_STORAGE_BUCKET).remove([blobPath]);
  if (rmErr) {
    // Extracted successfully but cleanup failed. The verifier still works
    // (loose files are present); the leftover blob will be ignored downstream
    // because verifier matches by exact filename and `agent_output` isn't
    // SUBMISSION.md. Surface the soft error in logs but don't fail the request.
    console.warn(`agent_output extracted but cleanup failed for submission ${submissionId}: ${rmErr.message}`);
  }

  return { kind: "extracted", files_written: filesWritten, bytes_written: bytesWritten };
}
