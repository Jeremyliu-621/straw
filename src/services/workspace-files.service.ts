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
import { encodeCursor, decodeCursor } from "@/lib/cursor";

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
    // Decode in case the client passes back the base64url-encoded form
    // (iter 6 — see src/lib/cursor.ts). Lenient on legacy raw-ISO.
    const decoded = decodeCursor(opts.cursor);
    query = query.lt("updated_at", decoded);
  }

  const { data, error } = await query;
  if (error) return { kind: "internal" };

  const rows = (data ?? []) as WorkspaceFileMetadata[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    data: page,
    has_more: hasMore,
    next_cursor: hasMore ? encodeCursor(page[page.length - 1].updated_at) : null,
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

// ── Presigned upload (post-iter-6 BLOCKER fix) ──────────────────
//
// Vercel's body parser caps function-proxied uploads at ~4.5MB even
// though our application-layer cap is 25MB. The presigned-URL flow
// bypasses the function entirely: client gets a one-shot signed PUT
// URL pointing directly at Supabase Storage, pushes bytes there, then
// calls /finalize to write the metadata row. The function never sees
// the bytes — Storage's only cap is the bucket's `file_size_limit`
// (25MB by default; raise the bucket if you need bigger).

export interface MintUploadUrlInput {
  path: string;
  expected_size_bytes?: number;
  content_type?: string;
}

export interface MintUploadUrlResult {
  upload_url: string;
  upload_method: "PUT";
  path: string;
  storage_ref: string;
  expires_at: string;
  // How the client should call /finalize once the PUT lands.
  finalize_url: string;
  finalize_method: "POST";
}

/**
 * Phase 1 of the presigned upload flow. Validates path, runs an
 * advisory quota preflight if `expected_size_bytes` is provided
 * (non-binding — the real check happens at finalize against the
 * actually-uploaded byte count), and mints a signed PUT URL.
 */
export async function mintWorkspaceFileUploadUrl(
  db: SupabaseClient,
  agentId: string,
  input: MintUploadUrlInput
): Promise<MintUploadUrlResult | WorkspaceFilesError> {
  const pathCheck = validatePath(input.path);
  if (!pathCheck.ok) return { kind: "invalid_path", reason: pathCheck.reason };

  if (typeof input.expected_size_bytes === "number") {
    if (input.expected_size_bytes > WORKSPACE_FILES_MAX_PER_FILE_BYTES) {
      return {
        kind: "file_too_large",
        size_bytes: input.expected_size_bytes,
        limit: WORKSPACE_FILES_MAX_PER_FILE_BYTES,
      };
    }

    const { data: quotaRows, error } = await db
      .from("agent_workspace_files")
      .select("size_bytes, path")
      .eq("agent_id", agentId);
    if (error) return { kind: "internal" };

    const existing = (quotaRows ?? []).find((r) => r.path === input.path);
    const currentFiles = (quotaRows ?? []).length;
    const currentBytes = (quotaRows ?? []).reduce(
      (acc, r) => acc + (r.size_bytes ?? 0),
      0
    );
    const wouldBeBytes =
      currentBytes - (existing?.size_bytes ?? 0) + input.expected_size_bytes;

    if (!existing && currentFiles >= WORKSPACE_FILES_MAX_FILES_PER_AGENT) {
      return {
        kind: "file_quota_exceeded",
        current: currentFiles,
        limit: WORKSPACE_FILES_MAX_FILES_PER_AGENT,
      };
    }
    if (wouldBeBytes > WORKSPACE_FILES_MAX_TOTAL_BYTES_PER_AGENT) {
      return {
        kind: "byte_quota_exceeded",
        current: currentBytes,
        would_be: wouldBeBytes,
        limit: WORKSPACE_FILES_MAX_TOTAL_BYTES_PER_AGENT,
      };
    }
  }

  const storageRef = storageRefFor(agentId, input.path);

  const { data, error } = await db.storage
    .from(WORKSPACE_FILES_BUCKET)
    .createSignedUploadUrl(storageRef);

  if (error || !data) {
    return { kind: "storage_error", reason: error?.message ?? "failed to mint upload url" };
  }

  // Supabase signed upload URLs are valid for ~2 hours by default. We
  // surface an explicit ISO timestamp so the client can retry the mint
  // if their upload is slower than that.
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  return {
    upload_url: data.signedUrl,
    upload_method: "PUT",
    path: input.path,
    storage_ref: storageRef,
    expires_at: expiresAt,
    finalize_url: "/api/v1/workspace/files/finalize",
    finalize_method: "POST",
  };
}

/**
 * Phase 2 of the presigned upload flow. Inspects the actually-uploaded
 * blob in Storage to get its real size, runs all caps + quota checks
 * against the real number, then writes the metadata row. If any check
 * fails, the orphan blob is removed best-effort.
 */
export async function finalizeWorkspaceFileUpload(
  db: SupabaseClient,
  agentId: string,
  input: { path: string; content_type?: string }
): Promise<WorkspaceFileMetadata | WorkspaceFilesError> {
  const pathCheck = validatePath(input.path);
  if (!pathCheck.ok) return { kind: "invalid_path", reason: pathCheck.reason };

  const storageRef = storageRefFor(agentId, input.path);

  // Inspect the uploaded blob via Storage list. The SDK's `.list(folder)`
  // takes a folder + a `search` filter; we slice the storage_ref to get
  // those.
  const lastSlash = storageRef.lastIndexOf("/");
  const folder = lastSlash >= 0 ? storageRef.slice(0, lastSlash) : "";
  const filename = lastSlash >= 0 ? storageRef.slice(lastSlash + 1) : storageRef;

  const { data: files, error: listError } = await db.storage
    .from(WORKSPACE_FILES_BUCKET)
    .list(folder, { limit: 100, search: filename });

  if (listError) return { kind: "storage_error", reason: listError.message };

  const blob = (files ?? []).find((f) => f.name === filename);
  if (!blob) {
    // Either the client never PUT, or the URL expired.
    return { kind: "not_found" };
  }

  const actualSize = blob.metadata?.size ?? 0;
  if (actualSize <= 0) {
    // Zero-byte file — treat as a botched upload. Don't write metadata.
    await db.storage.from(WORKSPACE_FILES_BUCKET).remove([storageRef]).catch(() => {});
    return { kind: "storage_error", reason: "uploaded blob is empty" };
  }

  if (actualSize > WORKSPACE_FILES_MAX_PER_FILE_BYTES) {
    await db.storage.from(WORKSPACE_FILES_BUCKET).remove([storageRef]).catch(() => {});
    return {
      kind: "file_too_large",
      size_bytes: actualSize,
      limit: WORKSPACE_FILES_MAX_PER_FILE_BYTES,
    };
  }

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
  const currentBytes = (quotaRows ?? []).reduce(
    (acc, r) => acc + (r.size_bytes ?? 0),
    0
  );

  if (!existing && currentFiles >= WORKSPACE_FILES_MAX_FILES_PER_AGENT) {
    await db.storage.from(WORKSPACE_FILES_BUCKET).remove([storageRef]).catch(() => {});
    return {
      kind: "file_quota_exceeded",
      current: currentFiles,
      limit: WORKSPACE_FILES_MAX_FILES_PER_AGENT,
    };
  }

  const wouldBeBytes = currentBytes - (existing?.size_bytes ?? 0) + actualSize;
  if (wouldBeBytes > WORKSPACE_FILES_MAX_TOTAL_BYTES_PER_AGENT) {
    await db.storage.from(WORKSPACE_FILES_BUCKET).remove([storageRef]).catch(() => {});
    return {
      kind: "byte_quota_exceeded",
      current: currentBytes,
      would_be: wouldBeBytes,
      limit: WORKSPACE_FILES_MAX_TOTAL_BYTES_PER_AGENT,
    };
  }

  const contentType =
    input.content_type ?? blob.metadata?.mimetype ?? "application/octet-stream";

  const { data, error: dbError } = await db
    .from("agent_workspace_files")
    .upsert(
      {
        agent_id: agentId,
        path: input.path,
        storage_ref: storageRef,
        size_bytes: actualSize,
        content_type: contentType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,path" }
    )
    .select("path, size_bytes, content_type, created_at, updated_at")
    .single();

  if (dbError || !data) return { kind: "internal" };
  return data as WorkspaceFileMetadata;
}

/**
 * Delete a workspace file. Idempotent.
 * Response: `{ deleted: true, was_present: boolean }` (iter 6 — see KV
 * delete docstring for the rationale).
 */
export async function deleteWorkspaceFile(
  db: SupabaseClient,
  agentId: string,
  path: string
): Promise<{ deleted: true; was_present: boolean } | WorkspaceFilesError> {
  const check = validatePath(path);
  if (!check.ok) return { kind: "invalid_path", reason: check.reason };

  const { data: existing } = await db
    .from("agent_workspace_files")
    .select("storage_ref")
    .eq("agent_id", agentId)
    .eq("path", path)
    .maybeSingle();

  if (!existing) return { deleted: true, was_present: false };

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
  return { deleted: true, was_present: true };
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
