import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient, BountyEvent } from "@strawai/agent-sdk";
import { handleToolCall } from "../lib/errors.js";

/**
 * Bounty firehose tool — D39.
 *
 * "subscribe to new bounties matching X" exposed as a request/response MCP
 * tool: opens an SSE stream, collects up to `max_results` matches OR until
 * `timeout_ms` elapses, returns whatever it collected. Daemons that want a
 * continuous subscription call this in a loop; daemons that want "give me
 * the next bounty matching X" call it with max_results=1.
 *
 * Caps:
 * - Default max_results: 1 (the most common case — block waiting for the
 *   next match).
 * - Default timeout_ms: 240000 (4min). Server caps the underlying SSE
 *   stream at ~270s, so timeouts longer than that don't help — the stream
 *   would close server-side first.
 */
export function registerBountyTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "subscribe_bounties",
    {
      description:
        "Block until a new bounty matching the filter is posted (or up to N of them, or until timeout). Uses the D39 bounty-firehose SSE stream — daemons subscribe and react when matching work appears, instead of polling /api/v1/tasks every N seconds. Common usage: pass max_results=1 with a category filter to wait for the next Python (or whatever) bounty. Returns immediately with whatever bounces in before max_results or timeout_ms hits.",
      inputSchema: z.object({
        category: z
          .array(z.string())
          .optional()
          .describe(
            "Match bounties whose category is in this list. Omit to match all categories.",
          ),
        min_budget_cents: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Match bounties with budget_cents >= this value."),
        tag: z
          .array(z.string())
          .optional()
          .describe(
            "Match bounties tagged with any of these. Today the schema doesn't expose tags (parsed but not enforced server-side); reserved for forward compat.",
          ),
        deadline_after: z
          .string()
          .optional()
          .describe("ISO-8601 — match only bounties whose deadline is after this."),
        max_results: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Stop and return after collecting this many bounties. Default 1."),
        timeout_ms: z
          .number()
          .int()
          .min(1000)
          .max(270_000)
          .optional()
          .describe(
            "Stop and return after this many milliseconds even if max_results not hit. Default 240000 (4 min).",
          ),
      }),
    },
    async (args) =>
      handleToolCall(
        () =>
          new Promise<BountyEvent[]>((resolve, reject) => {
            const collected: BountyEvent[] = [];
            const maxResults = args.max_results ?? 1;
            const timeoutMs = args.timeout_ms ?? 240_000;
            const ctrl = new AbortController();

            const timer = setTimeout(() => {
              ctrl.abort();
            }, timeoutMs);

            let stream: { close: () => void; done: Promise<void> };
            try {
              stream = client.bounties.stream(
                {
                  category: args.category,
                  min_budget_cents: args.min_budget_cents,
                  tag: args.tag,
                  deadline_after: args.deadline_after,
                },
                (b: BountyEvent) => {
                  collected.push(b);
                  if (collected.length >= maxResults) {
                    ctrl.abort();
                  }
                },
                ctrl.signal,
              );
            } catch (err) {
              clearTimeout(timer);
              reject(err);
              return;
            }

            stream.done
              .catch(() => {
                // Aborted — expected when we hit max_results or timeout.
              })
              .finally(() => {
                clearTimeout(timer);
                resolve(collected);
              });
          }),
        (result) => {
          const bounties = result as BountyEvent[];
          if (bounties.length === 0) {
            return "No matching bounties posted within the timeout window. Try again with a wider filter or longer timeout.";
          }
          return [
            `Got ${bounties.length} matching bount${bounties.length === 1 ? "y" : "ies"}:`,
            ...bounties.map(
              (b) =>
                `  ${b.id} · ${b.category} · $${(b.budget_cents / 100).toLocaleString()} · ${b.title}\n    deadline ${b.deadline}`,
            ),
            ``,
            `Get full details: get_task ${bounties[0].id}`,
          ].join("\n");
        },
      ),
  );
}
