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

const { PUT } = await import("@/app/api/v1/tasks/[id]/rubric/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ────────────────────────────────────────────────────

describe("PUT /api/v1/tasks/[id]/rubric", () => {
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
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/rubric",
        { criteria: [] },
        "PUT"
      );
      const res = await PUT(req, makeParams(UUID.task1));

      expect(res.status).toBe(401);
    });
  });

  describe("validation", () => {
    it("rejects invalid UUID", async () => {
      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/bad/rubric",
        { criteria: [] },
        "PUT"
      );
      const res = await PUT(req, makeParams("bad"));

      expect(res.status).toBe(400);
    });

    it("rejects empty criteria array", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "draft" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/rubric",
        { criteria: [] },
        "PUT"
      );
      const res = await PUT(req, makeParams(UUID.task1));

      expect(res.status).toBe(400);
    });

    it("rejects criteria weights not summing to 100", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "draft" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/rubric",
        {
          criteria: [
            { name: "A", weight: 30, position: 0 },
            { name: "B", weight: 30, position: 1 },
          ],
        },
        "PUT"
      );
      const res = await PUT(req, makeParams(UUID.task1));

      expect(res.status).toBe(400);
    });

    it("rejects criterion with weight below minimum (1)", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "draft" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/rubric",
        {
          criteria: [
            { name: "A", weight: 0, position: 0 },
            { name: "B", weight: 100, position: 1 },
          ],
        },
        "PUT"
      );
      const res = await PUT(req, makeParams(UUID.task1));

      expect(res.status).toBe(400);
    });

    it("rejects criterion with missing name", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "draft" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/rubric",
        {
          criteria: [
            { name: "", weight: 100, position: 0 },
          ],
        },
        "PUT"
      );
      const res = await PUT(req, makeParams(UUID.task1));

      expect(res.status).toBe(400);
    });

    it("rejects more than 20 criteria", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "draft" },
        error: null,
      });

      const criteria = Array.from({ length: 21 }, (_, i) => ({
        name: `Criterion ${i}`,
        weight: 5,
        position: i,
      }));

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/rubric",
        { criteria },
        "PUT"
      );
      const res = await PUT(req, makeParams(UUID.task1));

      expect(res.status).toBe(400);
    });
  });

  describe("permissions", () => {
    it("returns 404 when task not found", async () => {
      pushMockResult("tasks", { data: null, error: { code: "PGRST116" } });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/rubric",
        { criteria: [{ name: "A", weight: 100, position: 0 }] },
        "PUT"
      );
      const res = await PUT(req, makeParams(UUID.task1));

      expect(res.status).toBe(404);
    });

    it("returns 403 when not the task owner", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user2, status: "draft" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/rubric",
        { criteria: [{ name: "A", weight: 100, position: 0 }] },
        "PUT"
      );
      const res = await PUT(req, makeParams(UUID.task1));

      expect(res.status).toBe(403);
    });

    it("returns 409 when task is not draft", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "open" },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/rubric",
        { criteria: [{ name: "A", weight: 100, position: 0 }] },
        "PUT"
      );
      const res = await PUT(req, makeParams(UUID.task1));

      expect(res.status).toBe(409);
    });
  });

  describe("happy path", () => {
    it("replaces rubric criteria and returns 200", async () => {
      // Task fetch
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "draft" },
        error: null,
      });
      // Delete old criteria
      pushMockResult("rubric_criteria", { data: null, error: null });
      // Insert new criteria
      pushMockResult("rubric_criteria", {
        data: [
          { id: UUID.criterion1, task_id: UUID.task1, name: "Quality", weight: 60, position: 0 },
          { id: "eeee2222-2222-2222-2222-222222222222", task_id: UUID.task1, name: "Speed", weight: 40, position: 1 },
        ],
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/rubric",
        {
          criteria: [
            { name: "Quality", description: "Clean code", weight: 60, position: 0 },
            { name: "Speed", description: "Fast execution", weight: 40, position: 1 },
          ],
        },
        "PUT"
      );
      const res = await PUT(req, makeParams(UUID.task1));
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect(body).toHaveProperty("criteria");
    });

    it("accepts single criterion with weight 100", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1, status: "draft" },
        error: null,
      });
      pushMockResult("rubric_criteria", { data: null, error: null });
      pushMockResult("rubric_criteria", {
        data: [{ id: UUID.criterion1, name: "Overall", weight: 100, position: 0 }],
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/rubric",
        {
          criteria: [{ name: "Overall", weight: 100, position: 0 }],
        },
        "PUT"
      );
      const res = await PUT(req, makeParams(UUID.task1));

      expect(res.status).toBe(200);
    });
  });
});
