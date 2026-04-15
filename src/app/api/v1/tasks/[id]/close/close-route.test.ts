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

vi.mock("@/db/task-invitations", () => ({
  TaskInvitationRepository: class {
    expireByTask() {
      return Promise.resolve(undefined);
    }
  },
}));

// Sequential result tracking
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
    from: vi.fn((table: string) => createTableChain(table)),
  })),
}));

const { POST } = await import("@/app/api/v1/tasks/[id]/close/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ────────────────────────────────────────────────────

describe("POST /api/v1/tasks/[id]/close", () => {
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
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/close",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(401);
    });
  });

  describe("validation", () => {
    it("rejects invalid UUID for task ID", async () => {
      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/bad-uuid/close",
        {}
      );
      const res = await POST(req, makeParams("bad-uuid"));
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).code).toBe("INVALID_UUID");
    });
  });

  describe("permissions", () => {
    it("returns 404 when task does not exist", async () => {
      pushMockResult("tasks", { data: null, error: { code: "PGRST116" } });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/close",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(404);
    });

    it("returns 403 when user does not own the task", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user2, status: "open" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/close",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(403);
    });
  });

  describe("state transitions", () => {
    it("allows closing an open task", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "open" },
        error: null,
      });
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "closed" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/close",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect(body.status).toBe("closed");
    });

    it("allows closing an evaluating task", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "evaluating" },
        error: null,
      });
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "closed" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/close",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(200);
    });

    it("rejects closing a draft task", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "draft" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/close",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).code).toBe("INVALID_TRANSITION");
    });

    it("rejects closing an already closed task", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "closed" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/close",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(400);
    });
  });

  describe("error handling", () => {
    it("returns 500 when update fails", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "open" },
        error: null,
      });
      pushMockResult("tasks", {
        data: null,
        error: { code: "PGRST000", message: "db error" },
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/close",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(500);
    });
  });
});
