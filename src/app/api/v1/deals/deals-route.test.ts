import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockCompanyUser,
  mockAgentUser,
  makeGetRequest,
  makeJsonRequest,
  parseJsonResponse,
  validCreateDealPayload,
} from "@/test/api-test-helpers";
import type { AuthenticatedUser } from "@/lib/auth-unified";

// ── Mocks ────────────────────────────────────────────────────

let mockUser: AuthenticatedUser | null = null;

vi.mock("@/lib/auth-unified", () => ({
  authenticateRequest: vi.fn(() => Promise.resolve(mockUser)),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitResponse: vi.fn(() => null),
}));

vi.mock("@/lib/webhook-dispatch", () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/webhook.service", () => ({
  buildDealCreatedPayload: vi.fn(() => ({})),
}));

vi.mock("@/db/audit-log", () => ({
  AuditLogRepository: class {
    log() {
      return Promise.resolve(undefined);
    }
  },
}));

const callCounters: Record<string, number> = {};
const mockResultsByTable: Record<string, Array<{ data: unknown; error: unknown }>> = {};

function pushMockResult(table: string, result: { data: unknown; error: unknown }) {
  if (!mockResultsByTable[table]) mockResultsByTable[table] = [];
  mockResultsByTable[table].push(result);
}

function nextMockResult(table: string): { data: unknown; error: unknown } {
  const idx = callCounters[table] ?? 0;
  callCounters[table] = idx + 1;
  return (mockResultsByTable[table] ?? [])[idx] ?? { data: null, error: null };
}

function createTableChain(tableName: string) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "neq", "order", "limit", "gt", "lt", "in", "or", "update", "insert", "delete"]) {
    chain[m] = vi.fn((..._args: unknown[]) => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(nextMockResult(tableName)));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(nextMockResult(tableName)).then(resolve);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => createTableChain(table)),
  })),
}));

const { GET, POST } = await import("@/app/api/v1/deals/route");

// ── Tests ────────────────────────────────────────────────────

describe("GET /api/v1/deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(callCounters).forEach((k) => delete callCounters[k]);
    Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
    mockUser = mockCompanyUser();
  });

  describe("authentication", () => {
    it("returns 401 when unauthenticated", async () => {
      mockUser = null;
      const req = makeGetRequest("http://localhost:3000/api/v1/deals");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe("happy path", () => {
    it("returns paginated deals for the user", async () => {
      const deals = [
        {
          id: UUID.deal1,
          task_id: UUID.task1,
          company_id: UUID.user1,
          agent_id: UUID.agent1,
          deal_type: "output_purchase",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      pushMockResult("deals", { data: deals, error: null });

      const req = makeGetRequest("http://localhost:3000/api/v1/deals");
      const res = await GET(req);
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("pagination");
    });

    it("returns empty array when user has no deals", async () => {
      pushMockResult("deals", { data: [], error: null });

      const req = makeGetRequest("http://localhost:3000/api/v1/deals");
      const res = await GET(req);
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect(body.data).toEqual([]);
    });
  });
});

describe("POST /api/v1/deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(callCounters).forEach((k) => delete callCounters[k]);
    Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
    mockUser = mockCompanyUser();
  });

  describe("authentication", () => {
    it("returns 401 when unauthenticated", async () => {
      mockUser = null;
      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/deals",
        validCreateDealPayload()
      );
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe("validation", () => {
    it("rejects missing taskId", async () => {
      const payload = { ...validCreateDealPayload() };
      delete (payload as Record<string, unknown>).taskId;

      const req = makeJsonRequest("http://localhost:3000/api/v1/deals", payload);
      const res = await POST(req);
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).code).toBe("VALIDATION_ERROR");
    });

    it("rejects non-UUID taskId", async () => {
      const payload = validCreateDealPayload({ taskId: "not-a-uuid" });
      const req = makeJsonRequest("http://localhost:3000/api/v1/deals", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects non-UUID agentId", async () => {
      const payload = validCreateDealPayload({ agentId: "bad" });
      const req = makeJsonRequest("http://localhost:3000/api/v1/deals", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects invalid deal type", async () => {
      const payload = validCreateDealPayload({ dealType: "invalid" });
      const req = makeJsonRequest("http://localhost:3000/api/v1/deals", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects negative deal value", async () => {
      const payload = validCreateDealPayload({ dealValueCents: -100 });
      const req = makeJsonRequest("http://localhost:3000/api/v1/deals", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects invalid JSON body", async () => {
      const req = new Request("http://localhost:3000/api/v1/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer straw_sk_test",
        },
        body: "{broken",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe("business rules", () => {
    it("returns 404 when task does not exist", async () => {
      pushMockResult("tasks", { data: null, error: { code: "PGRST116" } });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/deals",
        validCreateDealPayload()
      );
      const res = await POST(req);

      expect(res.status).toBe(404);
    });

    it("returns 403 when user does not own the task", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user2, status: "closed" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/deals",
        validCreateDealPayload()
      );
      const res = await POST(req);
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(403);
      expect((body.error as Record<string, unknown>).message).toBe("Not your task");
    });

    it("returns 400 when task is not closed", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "open" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/deals",
        validCreateDealPayload()
      );
      const res = await POST(req);
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).code).toBe("TASK_NOT_CLOSED");
    });

    it("returns 400 when agent has no completed submission", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "closed" },
        error: null,
      });
      pushMockResult("submissions", { data: null, error: null });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/deals",
        validCreateDealPayload()
      );
      const res = await POST(req);
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).code).toBe("NO_SUBMISSION");
    });

    it("returns 409 when a deal already exists for the task", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "closed" },
        error: null,
      });
      pushMockResult("submissions", {
        data: { id: UUID.submission1 },
        error: null,
      });
      pushMockResult("deals", {
        data: { id: UUID.deal1 },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/deals",
        validCreateDealPayload()
      );
      const res = await POST(req);
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(409);
      expect((body.error as Record<string, unknown>).code).toBe("DEAL_EXISTS");
    });
  });

  describe("happy path", () => {
    it("creates a deal and returns 201", async () => {
      // Task exists, owned by user, closed
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "closed" },
        error: null,
      });
      // Agent has a completed submission
      pushMockResult("submissions", {
        data: { id: UUID.submission1 },
        error: null,
      });
      // No existing deal
      pushMockResult("deals", { data: null, error: null });
      // Deal insert
      pushMockResult("deals", {
        data: {
          id: UUID.deal1,
          task_id: UUID.task1,
          company_id: UUID.user1,
          agent_id: UUID.agent1,
          deal_type: "output_purchase",
          deal_value_cents: 50000,
          platform_fee_cents: 2500,
          created_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/deals",
        validCreateDealPayload()
      );
      const res = await POST(req);
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(201);
      expect(body.id).toBe(UUID.deal1);
      expect(body.deal_type).toBe("output_purchase");
    });

    it("accepts agent_hire deal type", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "closed" },
        error: null,
      });
      pushMockResult("submissions", {
        data: { id: UUID.submission1 },
        error: null,
      });
      pushMockResult("deals", { data: null, error: null });
      pushMockResult("deals", {
        data: {
          id: UUID.deal1,
          deal_type: "agent_hire",
          deal_value_cents: 100000,
          platform_fee_cents: 5000,
          created_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/deals",
        validCreateDealPayload({ dealType: "agent_hire", dealValueCents: 100000 })
      );
      const res = await POST(req);

      expect(res.status).toBe(201);
    });

    it("accepts zero-value deal", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "closed" },
        error: null,
      });
      pushMockResult("submissions", {
        data: { id: UUID.submission1 },
        error: null,
      });
      pushMockResult("deals", { data: null, error: null });
      pushMockResult("deals", {
        data: {
          id: UUID.deal1,
          deal_value_cents: 0,
          platform_fee_cents: 0,
          created_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/deals",
        validCreateDealPayload({ dealValueCents: 0 })
      );
      const res = await POST(req);

      expect(res.status).toBe(201);
    });
  });
});
