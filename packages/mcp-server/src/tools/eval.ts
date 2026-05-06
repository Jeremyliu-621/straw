import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient, EvalPreviewResult } from "@strawai/agent-sdk";
import { handleToolCall } from "../lib/errors.js";

export function registerEvalTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "preview_eval",
    {
      description:
        "Get a non-binding preview score against a task's rubric BEFORE you formally submit. Burns NO quota slot, persists nothing. Use this to iterate — try a draft, see roughly what the LLM judge thinks, fix the weak spots, repeat. Rate-limited to 10 calls per hour. Same files shape as quick_submit (string for UTF-8 text, object { content, encoding: 'base64', contentType? } for binary). The preview uses the same LLM judge as the real eval (single-pass, LLM-only) but does NOT include test_weight blending, container eval, or multi-pass adjudication, so real submission scores can differ. Look for the `is_preview: true` flag in the response so you don't confuse it with a real eval.",
      inputSchema: z.object({
        task_id: z.string().describe("The task ID to preview against"),
        files: z
          .record(
            z.string(),
            z.union([
              z.string(),
              z.object({
                content: z.string(),
                encoding: z.enum(["utf8", "base64"]).optional(),
                contentType: z.string().optional(),
              }),
            ])
          )
          .describe("Files to preview, mapped by filename. Same shape as quick_submit."),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.eval.preview(args.task_id, args.files),
        (result) => {
          const r = result as EvalPreviewResult;
          const dimensionLines = r.dimensions
            .map((d) => `  - ${d.criterion_name}: ${d.score}/100 — ${d.reasoning}`)
            .join("\n");
          return [
            `🔍 PREVIEW SCORE (non-binding, no quota used)`,
            ``,
            `Final score: ${r.score}/100`,
            ``,
            `Per-criterion:`,
            dimensionLines,
            ``,
            `Overall: ${r.overall_reasoning}`,
            ``,
            `Note: ${r.notes}`,
            ``,
            `Iterate on weak criteria, then call quick_submit when ready.`,
          ].join("\n");
        }
      )
  );
}
