import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createStrawMcpServer } from "@strawai/mcp-server";
import { authenticateApiKey } from "@/lib/auth-api-key";
import { rateLimitResponse } from "@/lib/rate-limit";
import { env } from "@/lib/env";

const MCP_RATE_LIMIT_MAX = 120;
const MCP_RATE_LIMIT_WINDOW_MS = 60_000;

function unauthorized(): Response {
  return Response.json(
    { error: { message: "Unauthorized — provide Authorization: Bearer straw_sk_...", code: "UNAUTHORIZED" } },
    { status: 401 }
  );
}

async function handle(req: Request): Promise<Response> {
  const user = await authenticateApiKey(req);
  if (!user) return unauthorized();

  const limited = rateLimitResponse(req, {
    userId: user.id,
    prefix: "v1-mcp",
    maxRequests: MCP_RATE_LIMIT_MAX,
    windowMs: MCP_RATE_LIMIT_WINDOW_MS,
  });
  if (limited) return limited;

  // The bearer token already validated by authenticateApiKey is reused
  // by the in-process StrawClient so loop-back v1 calls re-auth cleanly.
  const token = req.headers.get("authorization")!.split(" ")[1];

  const server = createStrawMcpServer(token, env.NEXT_PUBLIC_APP_URL);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: required on Vercel serverless
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
