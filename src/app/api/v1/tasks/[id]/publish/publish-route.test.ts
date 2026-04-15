import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockCompanyUser,
  mockAgentUser,
  makeJsonRequest,
  parseJsonResponse,
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
  buildTaskStatusChangedPayload: vi.fn(() => ({})),
}));

vi.mock("@/db/audit-log", () => ({
  AuditLogRepository: class {
    log() {
      return Promise.resolve(undefined);
    }
  },
}));

vi.mock("@/services/task-match-dispatch", () => ({
  dispatchTaskMatchedNotifications: vi.fn().mockResolvedValue(undefined),
}));

// Track call index per table to return different results for sequential calls
const callCounters: Record<string, number> = {};
const mockResultsByTable: Record<string, Array<{ data: unknown; error: unknown }>> = {};

function pushMockResult(table: string, result: { data: unknown; error: unknown }) {
  if (!mockResultsByTable[table]) mockResultsByTable[table] = [];
  mockResultsByTable[table].push(result);
}

function nextMockResult(table: string): { data: unknown; error: unknown } {
  const idx = callCounters[table] ?? 0;
  callCounters[table] = idx + 1;
  const results = mockResultsByTable[table] ?? [];
  return results[idx] ?? { data: null, error: null };
}

function createTableChain(tableName: string) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "gt", "lt", "in", "or", "update", "insert", "delete"]) {
    chain[m] = vi.fn((..._args: unknown[]) => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(nextMockResult(tableName)));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(nextMockResult(tableName)).then(resolve);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const chain = createTableChain(table);
      return chain;
    }),
  })),
}));

// ── Import handler after mocks ───────────────────────────────

const { POST } = await import("@/app/api/v1/tasks/[id]/publish/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ────────────────────────────────────────────────────

describe("POST /api/v1/tasks/[id]/publish", () => {
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
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/publish",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(401);
    });
  });

  describe("validation", () => {
    it("rejects invalid UUID", async () => {
      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/not-valid/publish",
        {}
      );
      const res = await POST(req, makeParams("not-valid"));
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).code).toBe("INVALID_UUID");
    });
  });

  describe("permissions", () => {
    it("returns 404 when task does not exist", async () => {
      pushMockResult("tasks", { data: null, error: { code: "PGRST116" } });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/publish",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(404);
    });

    it("returns 403 when user does not own the task", async () => {
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user2,
          status: "draft",
        },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/publish",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(403);
      expect((body.error as Record<string, unknown>).message).toBe("Not your task");
    });
  });

  describe("state transitions", () => {
    it("rejects publishing an already open task", async () => {
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1,
          status: "open",
        },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/publish",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).code).toBe("INVALID_TRANSITION");
    });

    it("rejects publishing a closed task", async () => {
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1,
          status: "closed",
        },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/publish",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(400);
    });
  });

  describe("rubric validation", () => {
    it("rejects when rubric weights do not sum to 100", async () => {
      // Task fetch
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "draft" },
        error: null,
      });

      // Rubric criteria query — weights sum to 80, not 100
      pushMockResult("rubric_criteria", {
        data: [{ weight: 50 }, { weight: 30 }],
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/publish",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).code).toBe("INVALID_WEIGHTS");
    });
  });

  describe("happy path", () => {
    it("publishes a draft task when rubric weights sum to 100", async () => {
      // 1) Fetch task
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "draft" },
        error: null,
      });

      // 2) Rubric criteria (thenable)
      pushMockResult("rubric_criteria", {
        data: [{ weight: 60 }, { weight: 40 }],
        error: null,
      });

      // 3) Update task status (single)
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1,
          status: "open",
          title: "Test Task",
          category: "code-generation",
          deadline: "2025-12-31",
          eval_mode: "llm",
          budget_cents: 50000,
        },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/publish",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect(body.status).toBe("open");
    });
  });

  describe("universal roles", () => {
    it("allows agent_builder to publish their own task (universal roles)", async () => {
      mockUser = mockAgentUser();

      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.agent1, status: "draft" },
        error: null,
      });
      pushMockResult("rubric_criteria", {
        data: [{ weight: 100 }],
        error: null,
      });
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.agent1,
          status: "open",
          title: "Agent Task",
          category: "other",
          deadline: "2025-12-31",
          eval_mode: "llm",
          budget_cents: 10000,
        },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/publish",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(200);
    });
  });
});
