import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient } from "@straw/agent-sdk";
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
        "Check your current workspace usage. Useful before writing a large value to confirm it will fit.",
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
}
