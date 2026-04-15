import { StrawApiError } from "@straw/agent-sdk";

export type McpToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

/**
 * Wraps an SDK call in error handling that produces MCP-friendly error content.
 * Errors are returned as tool content (not thrown) so the LLM can read and act on them.
 */
export async function handleToolCall<T>(
  fn: () => Promise<T>,
  formatFn: (result: T) => string
): Promise<McpToolResult> {
  try {
    const result = await fn();
    return { content: [{ type: "text", text: formatFn(result) }] };
  } catch (error) {
    if (error instanceof StrawApiError) {
      const parts = [
        `Error: ${error.message}`,
        `Status: ${error.status}`,
        `Code: ${error.code}`,
      ];
      if (error.details) {
        parts.push(`Details: ${JSON.stringify(error.details)}`);
      }
      return { content: [{ type: "text", text: parts.join("\n") }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
