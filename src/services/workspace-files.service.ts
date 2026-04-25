/**
 * Agent workspace files service — persistent blob storage scoped per agent.
 *
 * Pairs with workspace.service.ts (KV). Files are for the things daemons
 * want to keep around that don't fit in jsonb: compiled binaries, datasets,
 * partial build artifacts, model weights, screenshots, etc.
 *
 * Storage architecture:
 *   - Bytes live in Supabase Storage bucket WORKSPACE_FILES_BUCKET
 *     (default: `agent-workspace`, must be PRIVATE — created out-of-band).
 *   - Object key is always `${agentId}/${path}`. The route layer must
 *     always construct it from the authenticated agent_id; never trust
 *     a caller-supplied agent prefix.
 *   - Metadata (path → storage_ref + size + content_type) lives in the
 *     `agent_workspace_files` table from migration 033.
 *
 * Quotas (constants in src/constants.ts):
 *   - 1,000 files per agent
 *   - 25 MB per file
 *   - 100 MB total per agent
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WORKSPACE_FILES_BUCKET,
  WORKSPACE_FILES_MAX_FILES_PER_AGENT,
  WORKSPACE_FILES_MAX_PER_FILE_BYTES,
  WORKSPACE_FILES_MAX_TOTAL_BYTES_PER_AGENT,
  WORKSPACE_FILES_MAX_PATH_LENGTH,
  WORKSPACE_FILES_PATH_REGEX,
} from "@/constants";

// ── Types ────────────────────────────────────────────────────

export interface WorkspaceFileMetadata {
  path: string;
  size_bytes: number;
  content_type: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceFile extends WorkspaceFileMetadata {
  /** Raw bytes of the file. Only populated by `getWorkspaceFile`. */
  bytes: Uint8Array;
}

export interface WorkspaceFilesQuotaSnapshot {
  files_used: number;
  files_limit: number;
  bytes_used: number;
  bytes_limit: number;
  per_file_byte_limit: number;
}

export type WorkspaceFilesError =
  | { kind: "invalid_path"; reason: string }
  | { kind: "file_too_large"; size_bytes: number; limit: number }
  | { kind: "file_quota_exceeded"; current: number; limit: number }
  | { kind: "byte_quota_exceeded"; current: number; would_be: number; limit: number }
  | { kind: "not_found" }
  | { kind: "storage_error"; reason: string }
  | { kind: "internal" };

// ── Validation ───────────────────────────────────────────────

export function validatePath(path: string): { ok: true } | { ok: false; reason: string } {
  if (typeof path !== "string") return { ok: false, reason: "path must be a string" };
  if (path.length === 0) return { ok: false, reason: "path must not be empty" };
  if (path.length > WORKSPACE_FILES_MAX_PATH_LENGTH) {
    return { ok: false, reason: `path exceeds max length (${WORKSPACE_FILES_MAX_PATH_LENGTH})` };
  }
  if (!WORKSPACE_FILES_PATH_REGEX.test(path)) {
    return { ok: false, reason: "path contains disallowed characters (allowed: alphanumerics, . _ - : /)" };
  }
  // Defense in depth — the regex already excludes them, but be loud about why.
  if (path.includes("..")) return { ok: false, reason: "path must not contain '..'" };
  if (path.startsWith("/")) return { ok: false, reason: "path must be relative (no leading slash)" };
  return { ok: true };
}

function storageRefFor(agentId: string, path: string): string {
  return `${agentId}/${path}`;
}

// ── Read ─────────────────────────────────────────────────────

export async function getWorkspaceFileMetadata(
  db: SupabaseClient,
  agentId: string,
  path: string
): Promise<WorkspaceFileMetadata | WorkspaceFilesError> {
  const check = validatePath(path);
  if (!check.ok) return { kind: "invalid_path", reason: check.reason };

  const { data, error } = await db
    .from("agent_workspace_files")
    .select("path, size_bytes, content_type, created_at, updated_at")
    .eq("agent_id", agentId)
    .eq("path", path)
    .maybeSingle();

  if (error) return { kind: "internal" };
  if (!data) return { kind: "not_found" };
  return data as WorkspaceFileMetadata;
}

/**
 * Download the file bytes. Goes through Storage (the bytes don't live in
 * the metadata table). Returns metadata + bytes; caller decides what to
 * do with the bytes (proxy to client, base64-encode, etc.).
 */
export async function getWorkspaceFile(
  db: SupabaseClient,
  agentId: string,
  path: string
): Promise<WorkspaceFile | WorkspaceFilesError> {
  const meta = await getWorkspaceFileMetadata(db, agentId, path);
  if ("kind" in meta) return meta;

  const { data, error } = await db.storage
    .from(WORKSPACE_FILES_BUCKET)
    .download(storageRefFor(agentId, path));

  if (error || !data) return { kind: "storage_error", reason: error?.message ?? "download failed" };

  const buf = new Uint8Array(await data.arrayBuffer());
  return { ...meta, bytes: buf };
}

export interface ListFilesOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface ListFilesResult {
  data: WorkspaceFileMetadata[];
  has_more: boolean;
  next_cursor: string | null;
}

export async function listWorkspaceFiles(
  db: SupabaseClient,
  agentId: string,
  opts: ListFilesOptions = {}
): Promise<ListFilesResult | WorkspaceFilesError> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  let query = db
    .from("agent_workspace_files")
    .select("path, size_bytes, content_type, created_at, updated_at")
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false })
    .limit(limit + 1);

  if (opts.prefix) {
    const sanitized = opts.prefix.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.like("path", `${sanitized}%`);
  }
  if (opts.cursor) {
    query = query.lt("updated_at", opts.cursor);
  }

  const { data, error } = await query;
  if (error) return { kind: "internal" };

  const rows = (data ?? []) as WorkspaceFileMetadata[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    data: page,
    has_more: hasMore,
    next_cursor: hasMore ? page[page.length - 1].updated_at : null,
  };
}

// ── Write ────────────────────────────────────────────────────

export interface UploadFileInput {
  path: string;
  bytes: Uint8Array;
  content_type?: string;
}

/**
 * Upsert a workspace file. Enforces:
 *   - path validation (validatePath)
 *   - per-file size cap (WORKSPACE_FILES_MAX_PER_FILE_BYTES)
 *   - per-agent file-count cap (only on insert of a new path)
 *   - per-agent total-bytes cap (computed against the post-write delta)
 *
 * Two-phase write: upload bytes to Storage first, then upsert the metadata
 * row. If the metadata write fails after a successful upload we attempt
 * a best-effort cleanup; if THAT fails the orphan blob is recoverable
 * because the next successful upsert at the same path overwrites it.
 */
export async function uploadWorkspaceFile(
  db: SupabaseClient,
  agentId: string,
  input: UploadFileInput
): Promise<WorkspaceFileMetadata | WorkspaceFilesError> {
  const pathCheck = validatePath(input.path);
  if (!pathCheck.ok) return { kind: "invalid_path", reason: pathCheck.reason };

  const newSize = input.bytes.byteLength;
  if (newSize > WORKSPACE_FILES_MAX_PER_FILE_BYTES) {
    return { kind: "file_too_large", size_bytes: newSize, limit: WORKSPACE_FILES_MAX_PER_FILE_BYTES };
  }

  // Read existing metadata + total quota in one short window. Yes, this is
  // racy under concurrent writes from the same agent; the worst case is a
  // small over-quota by a few bytes, which we accept (and the per-file cap
  // bounds anyway).
  const { data: existing } = await db
    .from("agent_workspace_files")
    .select("size_bytes")
    .eq("agent_id", agentId)
    .eq("path", input.path)
    .maybeSingle();

  const { data: quotaRows, error: quotaError } = await db
    .from("agent_workspace_files")
    .select("size_bytes")
    .eq("agent_id", agentId);
  if (quotaError) return { kind: "internal" };

  const currentFiles = (quotaRows ?? []).length;
  const currentBytes = (quotaRows ?? []).reduce((acc, r) => acc + (r.size_bytes ?? 0), 0);

  if (!existing && currentFiles >= WORKSPACE_FILES_MAX_FILES_PER_AGENT) {
    return {
      kind: "file_quota_exceeded",
      current: currentFiles,
      limit: WORKSPACE_FILES_MAX_FILES_PER_AGENT,
    };
  }

  const wouldBeBytes = currentBytes - (existing?.size_bytes ?? 0) + newSize;
  if (wouldBeBytes > WORKSPACE_FILES_MAX_TOTAL_BYTES_PER_AGENT) {
    return {
      kind: "byte_quota_exceeded",
      current: currentBytes,
      would_be: wouldBeBytes,
      limit: WORKSPACE_FILES_MAX_TOTAL_BYTES_PER_AGENT,
    };
  }

  const storageRef = storageRefFor(agentId, input.path);
  const contentType = input.content_type ?? "application/octet-stream";

  // Phase 1: Storage upload.
  const { error: uploadError } = await db.storage
    .from(WORKSPACE_FILES_BUCKET)
    .upload(storageRef, input.bytes, { upsert: true, contentType });
  if (uploadError) return { kind: "storage_error", reason: uploadError.message };

  // Phase 2: metadata upsert.
  const { data, error: dbError } = await db
    .from("agent_workspace_files")
    .upsert(
      {
        agent_id: agentId,
        path: input.path,
        storage_ref: storageRef,
        size_bytes: newSize,
        content_type: contentType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,path" }
    )
    .select("path, size_bytes, content_type, created_at, updated_at")
    .single();

  if (dbError || !data) {
    // Best-effort cleanup. Orphaned blob will get overwritten on a future
    // successful upsert at this path; it's bounded by the per-file cap.
    await db.storage.from(WORKSPACE_FILES_BUCKET).remove([storageRef]).catch(() => {});
    return { kind: "internal" };
  }

  return data as WorkspaceFileMetadata;
}

export async function deleteWorkspaceFile(
  db: SupabaseClient,
  agentId: string,
  path: string
): Promise<{ deleted: boolean } | WorkspaceFilesError> {
  const check = validatePath(path);
  if (!check.ok) return { kind: "invalid_path", reason: check.reason };

  const { data: existing } = await db
    .from("agent_workspace_files")
    .select("storage_ref")
    .eq("agent_id", agentId)
    .eq("path", path)
    .maybeSingle();

  if (!existing) return { deleted: false };

  // Delete metadata row first; if the bytes-delete fails the row is gone
  // so the file is "deleted" from the agent's perspective. The orphan
  // blob can be reaped by a sweep later.
  const { error: dbError } = await db
    .from("agent_workspace_files")
    .delete()
    .eq("agent_id", agentId)
    .eq("path", path);
  if (dbError) return { kind: "internal" };

  await db.storage.from(WORKSPACE_FILES_BUCKET).remove([existing.storage_ref]).catch(() => {});
  return { deleted: true };
}

// ── Quota ────────────────────────────────────────────────────

export async function getWorkspaceFilesQuota(
  db: SupabaseClient,
  agentId: string
): Promise<WorkspaceFilesQuotaSnapshot | WorkspaceFilesError> {
  const { data, error } = await db
    .from("agent_workspace_files")
    .select("size_bytes")
    .eq("agent_id", agentId);
  if (error) return { kind: "internal" };
  const rows = data ?? [];
  return {
    files_used: rows.length,
    files_limit: WORKSPACE_FILES_MAX_FILES_PER_AGENT,
    bytes_used: rows.reduce((acc, r) => acc + (r.size_bytes ?? 0), 0),
    bytes_limit: WORKSPACE_FILES_MAX_TOTAL_BYTES_PER_AGENT,
    per_file_byte_limit: WORKSPACE_FILES_MAX_PER_FILE_BYTES,
  };
}
