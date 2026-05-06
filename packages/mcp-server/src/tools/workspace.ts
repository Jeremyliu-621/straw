import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient } from "@strawai/agent-sdk";
import { handleToolCall } from "../lib/errors.js";

/**
 * Workspace tools — per-agent persistent KV store.
 *
 * Per the agent-first dream: daemons that can remember things across
 * submissions and tasks build up knowledge over time. These tools expose
 * the KV layer so an agent can `workspace_set("seen_tasks", [...])`,
 * resume work after crashing, share state across tasks, etc.
 *
 * Quotas (enforced server-side, see DECISIONS.md D24):
 *   - 10,000 keys per agent
 *   - 1MB per value
 *   - 10MB total per agent
 *
 * Key shape: alphanumerics + `. _ - : /`. Use `/` to namespace
 * (`task/12345/notes`, `seen-tasks:2026-04-25`).
 */
export function registerWorkspaceTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "workspace_get",
    {
      description:
        "Read a value from your persistent agent workspace. Returns the value if it exists, or 404. Use this to remember things across submissions: `workspace_get('agent_state')` → your last saved state.",
      inputSchema: z.object({
        key: z.string().min(1).max(200).describe("The key to read"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.workspace.get(args.key),
        (entry) => {
          const e = entry as { key: string; value: unknown; size_bytes: number; updated_at: string };
          return `${e.key} (${e.size_bytes}B, updated ${e.updated_at})\n${JSON.stringify(e.value, null, 2)}`;
        }
      )
  );

  server.registerTool(
    "workspace_set",
    {
      description:
        "Write a value to your persistent agent workspace. Upserts — replaces any existing value at this key. Caps: 1MB per value, 10k keys total per agent, 10MB total bytes per agent.",
      inputSchema: z.object({
        key: z.string().min(1).max(200).describe("The key to write. Allowed chars: alphanumerics + . _ - : /"),
        value: z.unknown().describe("The value to store. Any JSON-serializable value."),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.workspace.set(args.key, args.value),
        (entry) => {
          const e = entry as { key: string; size_bytes: number; updated_at: string };
          return `Stored ${e.key} (${e.size_bytes}B, updated ${e.updated_at})`;
        }
      )
  );

  server.registerTool(
    "workspace_delete",
    {
      description:
        "Delete a key from your workspace. Idempotent — succeeds even if the key didn't exist.",
      inputSchema: z.object({
        key: z.string().min(1).max(200).describe("The key to delete"),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.workspace.delete(args.key),
        (result) => {
          const r = result as { deleted: boolean };
          return r.deleted ? `Deleted ${args.key}` : `Key ${args.key} did not exist (no-op)`;
        }
      )
  );

  server.registerTool(
    "workspace_list",
    {
      description:
        "List your workspace keys with optional prefix filter. Returns metadata only (key, size, timestamps) — fetch specific values with workspace_get. Sorted by most-recently-updated first.",
      inputSchema: z.object({
        prefix: z.string().optional().describe("Restrict to keys starting with this prefix"),
        limit: z.number().int().min(1).max(200).optional().describe("Page size (default 50)"),
        cursor: z.string().optional().describe("Pagination cursor from a previous response"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.workspace.list(args),
        (result) => {
          const r = result as { data: Array<{ key: string; size_bytes: number; updated_at: string }>; has_more: boolean; next_cursor: string | null };
          if (r.data.length === 0) return "(workspace is empty)";
          const lines = r.data.map((e) => `  ${e.key} — ${e.size_bytes}B, updated ${e.updated_at}`);
          if (r.has_more) lines.push(`  (more — pass cursor=${r.next_cursor})`);
          return `${r.data.length} key${r.data.length === 1 ? "" : "s"}:\n${lines.join("\n")}`;
        }
      )
  );

  server.registerTool(
    "workspace_quota",
    {
      description:
        "Check your current workspace KV usage. Useful before writing a large value to confirm it will fit. For file storage, use workspace_files_quota.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      handleToolCall(
        () => client.workspace.quota(),
        (q) => {
          const s = q as { keys_used: number; keys_limit: number; bytes_used: number; bytes_limit: number };
          return [
            `Keys: ${s.keys_used} / ${s.keys_limit}`,
            `Bytes: ${s.bytes_used} / ${s.bytes_limit} (${((s.bytes_used / s.bytes_limit) * 100).toFixed(1)}% used)`,
          ].join("\n");
        }
      )
  );

  // ── Files (D26 — persistent blob storage) ──────────────────

  server.registerTool(
    "workspace_upload_file",
    {
      description:
        "Upload a file to your persistent agent workspace. For things too big or binary for KV — compiled binaries, datasets, model weights, screenshots. Pass the bytes as a base64 string. Caps: 25MB per file, 100MB total per agent, 1000 files per agent.",
      inputSchema: z.object({
        path: z.string().min(1).max(512).describe("Path within your workspace (e.g. 'compiled/agent-v3.bin'). Allowed: alphanumerics + . _ - : /"),
        content_base64: z.string().min(1).describe("Base64-encoded file bytes."),
        content_type: z.string().optional().describe("MIME type (default: application/octet-stream)."),
      }),
    },
    async (args) =>
      handleToolCall(
        async () => {
          const bytes = new Uint8Array(Buffer.from(args.content_base64, "base64"));
          return client.workspace.uploadFile(args.path, bytes, { contentType: args.content_type });
        },
        (meta) => {
          const m = meta as { path: string; size_bytes: number; content_type: string; updated_at: string };
          return `Uploaded ${m.path} (${m.size_bytes}B, ${m.content_type}, updated ${m.updated_at})`;
        }
      )
  );

  server.registerTool(
    "workspace_download_file",
    {
      description:
        "Download a file from your workspace. Returns base64-encoded bytes plus metadata. Use workspace_file_metadata first if you only need the size.",
      inputSchema: z.object({
        path: z.string().min(1).max(512).describe("Path of the file to download"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        async () => {
          const bytes = await client.workspace.downloadFile(args.path);
          const meta = await client.workspace.fileMetadata(args.path);
          return { ...meta, content_base64: Buffer.from(bytes).toString("base64") };
        },
        (result) => {
          const r = result as { path: string; size_bytes: number; content_type: string; content_base64: string };
          return `${r.path} (${r.size_bytes}B, ${r.content_type})\n[base64 ${r.content_base64.length} chars]\n${r.content_base64.slice(0, 200)}${r.content_base64.length > 200 ? "..." : ""}`;
        }
      )
  );

  server.registerTool(
    "workspace_file_metadata",
    {
      description:
        "Get metadata for a workspace file (size, content_type, timestamps) without downloading the bytes.",
      inputSchema: z.object({
        path: z.string().min(1).max(512).describe("Path of the file"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.workspace.fileMetadata(args.path),
        (meta) => {
          const m = meta as { path: string; size_bytes: number; content_type: string; created_at: string; updated_at: string };
          return `${m.path} — ${m.size_bytes}B, ${m.content_type}, created ${m.created_at}, updated ${m.updated_at}`;
        }
      )
  );

  server.registerTool(
    "workspace_delete_file",
    {
      description:
        "Delete a file from your workspace. Idempotent — succeeds even if the file didn't exist.",
      inputSchema: z.object({
        path: z.string().min(1).max(512).describe("Path of the file to delete"),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.workspace.deleteFile(args.path),
        (result) => {
          const r = result as { deleted: boolean };
          return r.deleted ? `Deleted ${args.path}` : `File ${args.path} did not exist (no-op)`;
        }
      )
  );

  server.registerTool(
    "workspace_list_files",
    {
      description:
        "List files in your workspace. Optional prefix filter. Returns metadata only (path, size, content_type, timestamps) — fetch bytes via workspace_download_file. Sorted by most-recently-updated first.",
      inputSchema: z.object({
        prefix: z.string().optional().describe("Restrict to paths starting with this prefix"),
        limit: z.number().int().min(1).max(200).optional().describe("Page size (default 50)"),
        cursor: z.string().optional().describe("Pagination cursor from a previous response"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.workspace.listFiles(args),
        (result) => {
          const r = result as { data: Array<{ path: string; size_bytes: number; content_type: string; updated_at: string }>; has_more: boolean; next_cursor: string | null };
          if (r.data.length === 0) return "(no files)";
          const lines = r.data.map((f) => `  ${f.path} — ${f.size_bytes}B (${f.content_type}), updated ${f.updated_at}`);
          if (r.has_more) lines.push(`  (more — pass cursor=${r.next_cursor})`);
          return `${r.data.length} file${r.data.length === 1 ? "" : "s"}:\n${lines.join("\n")}`;
        }
      )
  );

  server.registerTool(
    "workspace_files_quota",
    {
      description:
        "Check your current workspace file-storage usage. Returns files used, bytes used, and per-file/total limits.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      handleToolCall(
        () => client.workspace.filesQuota(),
        (q) => {
          const s = q as { files_used: number; files_limit: number; bytes_used: number; bytes_limit: number; per_file_byte_limit: number };
          return [
            `Files: ${s.files_used} / ${s.files_limit}`,
            `Bytes: ${s.bytes_used} / ${s.bytes_limit} (${((s.bytes_used / s.bytes_limit) * 100).toFixed(1)}% used)`,
            `Per-file cap: ${s.per_file_byte_limit}B`,
          ].join("\n");
        }
      )
  );
}
