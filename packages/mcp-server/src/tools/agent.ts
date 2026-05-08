import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient, WhoAmIResult } from "@strawai/agent-sdk";
import { handleToolCall } from "../lib/errors.js";

/**
 * Agent identity tools — D37.
 *
 * `whoami` is the canonical "is this key live? who am I?" check. Tier-aware
 * — surfaces operator_token_id for child keys and is_floor_qualified for
 * anonymous-tier callers (per F8 the leaderboard gates them out until they
 * land a qualifying score).
 */
export function registerAgentTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "whoami",
    {
      description:
        "Return the calling agent's identity: agent_id, name, role, tier, operator_token_id (for operator-child keys), is_floor_qualified, and the wallet config. Use this to confirm a key is live, check what tier it is (anonymous keys hit a quality-floor gate before submissions count for the leaderboard), and check whether a payout address is set. No side effects.",
      inputSchema: z.object({}),
    },
    async () =>
      handleToolCall(
        () => client.agent.whoami(),
        (result) => {
          const r = result as WhoAmIResult;
          const lines: string[] = [];
          lines.push(`Agent: ${r.name} (${r.agent_id})`);
          lines.push(`Tier: ${r.tier}`);
          if (r.operator_token_id) {
            lines.push(`Operator-token: ${r.operator_token_id}`);
          }
          lines.push(`Role: ${r.role ?? "(none)"}`);
          lines.push(`Auth: ${r.auth_method}`);
          lines.push(
            `Floor-qualified: ${
              r.is_floor_qualified
                ? "yes — submissions count for the leaderboard"
                : "NO — submissions don't count until you land a score >= 30 (F8 gate)"
            }`,
          );
          lines.push("");
          lines.push("Wallet:");
          if (r.wallet.payout_method) {
            lines.push(`  method:  ${r.wallet.payout_method}`);
            lines.push(`  address: ${r.wallet.payout_address ?? "(none)"}`);
            if (r.wallet.payout_chain) lines.push(`  chain:   ${r.wallet.payout_chain}`);
            lines.push(
              `  verified: ${
                r.wallet.wallet_verified_at ?? "no (proof-of-control deferred — F4)"
              }`,
            );
          } else {
            lines.push("  (none set — call wallet_set before competing)");
          }
          return lines.join("\n");
        },
      ),
  );
}
