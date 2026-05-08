import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ApiKeyUser } from "@/lib/auth-api-key";

// ── Mocks ────────────────────────────────────────────────────

let mockUser: ApiKeyUser | null = null;

vi.mock("@/lib/auth-api-key", () => ({
  authenticateApiKey: vi.fn(() => Promise.resolve(mockUser)),
}));

let rateLimitNext: Response | null = null;
vi.mock("@/lib/rate-limit", () => ({
  rateLimitResponse: vi.fn(() => rateLimitNext),
}));

// ── Import after mocks ───────────────────────────────────────

const { POST, GET, DELETE } = await import("@/app/api/v1/mcp/route");

// ── Helpers ──────────────────────────────────────────────────

const VALID_USER: ApiKeyUser = {
  id: "11111111-1111-4111-a111-111111111111",
  email: "agent@example.com",
  name: "Test Agent",
  role: "agent_builder",
  supabaseId: "11111111-1111-4111-a111-111111111111",
  onboarded: true,
  tier: "verified",
  operatorTokenId: null,
  isFloorQualified: true,
};

function jsonRpcRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/v1/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": "Bearer straw_sk_test123",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function readSseOrJson(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("text/event-stream")) {
    const text = await res.text();
    // Pull the JSON payload out of the first `data: ...` line
    const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
    if (!dataLine) throw new Error(`No data line in SSE response: ${text}`);
    return JSON.parse(dataLine.slice("data:".length).trim());
  }
  return await res.json();
}

// ── Tests ────────────────────────────────────────────────────

describe("POST /api/v1/mcp — auth", () => {
  beforeEach(() => {
    mockUser = null;
    rateLimitNext = null;
  });

  it("rejects requests with no Authorization header", async () => {
    mockUser = null;
    const req = new Request("http://localhost:3000/api/v1/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects requests with invalid bearer token", async () => {
    mockUser = null;
    const res = await POST(jsonRpcRequest({ jsonrpc: "2.0", id: 1, method: "ping" }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/mcp — rate limiting", () => {
  beforeEach(() => {
    mockUser = VALID_USER;
    rateLimitNext = null;
  });

  it("returns the rate-limit response when limit is exceeded", async () => {
    const limited = Response.json(
      { error: { message: "Too many requests.", code: "RATE_LIMITED" } },
      { status: 429 }
    );
    rateLimitNext = limited;
    const res = await POST(jsonRpcRequest({ jsonrpc: "2.0", id: 1, method: "ping" }));
    expect(res.status).toBe(429);
  });
});

describe("POST /api/v1/mcp — MCP protocol", () => {
  beforeEach(() => {
    mockUser = VALID_USER;
    rateLimitNext = null;
  });

  it("responds to `initialize` with serverInfo and tool capabilities", async () => {
    const req = jsonRpcRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test-client", version: "0.0.1" },
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = (await readSseOrJson(res)) as {
      result: {
        serverInfo: { name: string };
        capabilities: { tools?: unknown };
      };
    };
    expect(body.result.serverInfo.name).toBe("straw");
    expect(body.result.capabilities.tools).toBeDefined();
  });

  it("responds to `tools/list` with the registered Straw tools", async () => {
    const req = jsonRpcRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = (await readSseOrJson(res)) as {
      result: { tools: Array<{ name: string }> };
    };
    const names = body.result.tools.map((t) => t.name);
    expect(names).toContain("list_tasks");
    expect(names).toContain("get_task");
    expect(names).toContain("quick_submit");
    expect(names).toContain("get_submission");
  });
});

describe("DELETE /api/v1/mcp", () => {
  beforeEach(() => {
    mockUser = VALID_USER;
    rateLimitNext = null;
  });

  it("does not 5xx in stateless mode (DELETE without active session)", async () => {
    const req = new Request("http://localhost:3000/api/v1/mcp", {
      method: "DELETE",
      headers: { "Authorization": "Bearer straw_sk_test123" },
    });
    const res = await DELETE(req);
    // Stateless transport responds 405 Method Not Allowed for DELETE — that's fine,
    // what matters is that we don't crash with 500.
    expect(res.status).toBeLessThan(500);
  });
});

describe("GET /api/v1/mcp", () => {
  beforeEach(() => {
    mockUser = VALID_USER;
    rateLimitNext = null;
  });

  it("requires auth on GET as well", async () => {
    mockUser = null;
    const req = new Request("http://localhost:3000/api/v1/mcp", {
      method: "GET",
      headers: { "Accept": "text/event-stream" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
