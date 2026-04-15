import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockCompanyUser,
  mockAgentUser,
  makeGetRequest,
  makeJsonRequest,
  parseJsonResponse,
  validCreateTaskPayload,
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

// Sequential mock results per table
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
  // Thenable for non-terminal awaits (insert without .single(), delete, queries without .single())
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(nextMockResult(tableName)).then(resolve);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => createTableChain(table)),
  })),
}));

vi.mock("@/db/audit-log", () => ({
  AuditLogRepository: class {
    log() {
      return Promise.resolve(undefined);
    }
  },
}));

// ── Import handlers after mocks ──────────────────────────────

const { GET, POST } = await import("@/app/api/v1/tasks/route");

// ── Tests ────────────────────────────────────────────────────

describe("GET /api/v1/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(callCounters).forEach((k) => delete callCounters[k]);
    Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
    mockUser = mockCompanyUser();
  });

  describe("authentication", () => {
    it("returns 401 when no user is authenticated", async () => {
      mockUser = null;
      const req = makeGetRequest("http://localhost:3000/api/v1/tasks");
      const res = await GET(req);
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(401);
      expect(body.error).toEqual(
        expect.objectContaining({ message: "Unauthorized" })
      );
    });

    it("returns 401 when user has no supabaseId", async () => {
      mockUser = { ...mockCompanyUser(), supabaseId: "" };
      const req = makeGetRequest("http://localhost:3000/api/v1/tasks");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe("happy path", () => {
    it("returns paginated open tasks", async () => {
      const tasks = [
        { id: UUID.task1, title: "Task 1", created_at: "2024-01-01T00:00:00Z" },
        { id: UUID.task2, title: "Task 2", created_at: "2024-01-02T00:00:00Z" },
      ];

      // GET uses select().eq().order().limit() — the limit is the last chainable,
      // then the result is awaited (thenable). Push result for "tasks" table.
      pushMockResult("tasks", { data: tasks, error: null });

      const req = makeGetRequest("http://localhost:3000/api/v1/tasks?limit=20");
      const res = await GET(req);
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("pagination");
    });

    it("returns empty array when no tasks exist", async () => {
      pushMockResult("tasks", { data: [], error: null });

      const req = makeGetRequest("http://localhost:3000/api/v1/tasks");
      const res = await GET(req);
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect(body.data).toEqual([]);
      expect((body.pagination as Record<string, unknown>).has_more).toBe(false);
    });
  });

  describe("error handling", () => {
    it("returns 500 when database query fails", async () => {
      pushMockResult("tasks", {
        data: null,
        error: { code: "PGRST000", message: "db error" },
      });

      const req = makeGetRequest("http://localhost:3000/api/v1/tasks");
      const res = await GET(req);

      expect(res.status).toBe(500);
    });
  });
});

describe("POST /api/v1/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(callCounters).forEach((k) => delete callCounters[k]);
    Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
    mockUser = mockCompanyUser();
  });

  describe("authentication", () => {
    it("returns 401 when no user is authenticated", async () => {
      mockUser = null;
      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks",
        validCreateTaskPayload()
      );
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe("validation", () => {
    it("rejects empty body", async () => {
      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", {});
      const res = await POST(req);
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(400);
      expect(body.error).toEqual(
        expect.objectContaining({ code: "VALIDATION_ERROR" })
      );
    });

    it("rejects missing title", async () => {
      const payload = validCreateTaskPayload();
      delete (payload as Record<string, unknown>).title;

      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects title exceeding max length", async () => {
      const payload = validCreateTaskPayload({ title: "x".repeat(201) });
      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects budget below minimum ($100)", async () => {
      const payload = validCreateTaskPayload({ budget_cents: 50 });
      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects budget above maximum ($1,000,000)", async () => {
      const payload = validCreateTaskPayload({ budget_cents: 100_000_001 });
      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects deadline less than 24 hours from now", async () => {
      const payload = validCreateTaskPayload({
        deadline: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      });
      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects criteria weights not summing to 100", async () => {
      const payload = validCreateTaskPayload({
        criteria: [
          { name: "Correctness", weight: 50, position: 0 },
          { name: "Quality", weight: 40, position: 1 },
        ],
      });
      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects test_weight + llm_weight not summing to 100", async () => {
      const payload = validCreateTaskPayload({
        test_weight: 50,
        llm_weight: 60,
      });
      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects empty criteria array", async () => {
      const payload = validCreateTaskPayload({ criteria: [] });
      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects more than 20 criteria", async () => {
      const criteria = Array.from({ length: 21 }, (_, i) => ({
        name: `Criterion ${i}`,
        weight: i < 20 ? 5 : 0,
        position: i,
      }));
      const payload = validCreateTaskPayload({ criteria });
      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects container eval_mode without eval_image", async () => {
      const payload = validCreateTaskPayload({
        eval_mode: "container",
        eval_image: null,
      });
      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects invalid JSON body", async () => {
      const req = new Request("http://localhost:3000/api/v1/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer straw_sk_test123",
        },
        body: "not json{",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe("happy path", () => {
    it("creates a draft task with rubric criteria and returns 201", async () => {
      const taskData = {
        id: UUID.task1,
        company_id: UUID.user1,
        title: "Build a REST API parser",
        status: "draft",
        created_at: "2024-01-01T00:00:00Z",
      };

      // 1) Task insert -> .select().single()
      pushMockResult("tasks", { data: taskData, error: null });
      // 2) Rubric insert -> awaited directly (thenable)
      pushMockResult("rubric_criteria", { data: null, error: null });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks",
        validCreateTaskPayload()
      );
      const res = await POST(req);
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(201);
      expect(body.id).toBe(UUID.task1);
      expect(body.status).toBe("draft");
      expect(body.rubric_criteria).toBeDefined();
    });

    it("accepts container eval_mode with valid eval_image", async () => {
      const taskData = {
        id: UUID.task1,
        company_id: UUID.user1,
        status: "draft",
        eval_mode: "container",
        eval_image: "myorg/eval:latest",
      };

      pushMockResult("tasks", { data: taskData, error: null });
      pushMockResult("rubric_criteria", { data: null, error: null });

      const payload = validCreateTaskPayload({
        eval_mode: "container",
        eval_image: "myorg/eval:latest",
      });
      const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
      const res = await POST(req);

      expect(res.status).toBe(201);
    });
  });

  describe("universal roles", () => {
    it("allows any authenticated user to create a task regardless of role", async () => {
      mockUser = mockAgentUser();

      const taskData = {
        id: UUID.task1,
        company_id: UUID.agent1,
        status: "draft",
      };

      pushMockResult("tasks", { data: taskData, error: null });
      pushMockResult("rubric_criteria", { data: null, error: null });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks",
        validCreateTaskPayload()
      );
      const res = await POST(req);

      expect(res.status).toBe(201);
    });
  });

  describe("error handling", () => {
    it("returns 500 when task insert fails", async () => {
      pushMockResult("tasks", {
        data: null,
        error: { code: "23505", message: "duplicate" },
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks",
        validCreateTaskPayload()
      );
      const res = await POST(req);

      expect(res.status).toBe(500);
    });

    it("returns 500 and cleans up task when rubric insert fails", async () => {
      const taskData = { id: UUID.task1, company_id: UUID.user1, status: "draft" };

      // Task insert succeeds
      pushMockResult("tasks", { data: taskData, error: null });
      // Rubric insert fails
      pushMockResult("rubric_criteria", {
        data: null,
        error: { code: "23505", message: "rubric error" },
      });
      // Task delete (cleanup) — consumed via thenable
      pushMockResult("tasks", { data: null, error: null });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks",
        validCreateTaskPayload()
      );
      const res = await POST(req);

      expect(res.status).toBe(500);
    });
  });
});

describe("POST /api/v1/tasks — edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(callCounters).forEach((k) => delete callCounters[k]);
    Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
    mockUser = mockCompanyUser();
  });

  it("accepts minimum valid budget ($100 = 10000 cents)", async () => {
    const taskData = { id: UUID.task1, company_id: UUID.user1, status: "draft" };
    pushMockResult("tasks", { data: taskData, error: null });
    pushMockResult("rubric_criteria", { data: null, error: null });

    const payload = validCreateTaskPayload({ budget_cents: 10000 });
    const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("accepts single criterion with weight 100", async () => {
    const taskData = { id: UUID.task1, company_id: UUID.user1, status: "draft" };
    pushMockResult("tasks", { data: taskData, error: null });
    pushMockResult("rubric_criteria", { data: null, error: null });

    const payload = validCreateTaskPayload({
      criteria: [{ name: "Overall", weight: 100, position: 0 }],
    });
    const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("accepts description with special characters", async () => {
    const taskData = { id: UUID.task1, company_id: UUID.user1, status: "draft" };
    pushMockResult("tasks", { data: taskData, error: null });
    pushMockResult("rubric_criteria", { data: null, error: null });

    const payload = validCreateTaskPayload({
      description: "Test with <html> & \"quotes\" and unicode: \u00e9\u00e0\u00fc\u00f1",
    });
    const req = makeJsonRequest("http://localhost:3000/api/v1/tasks", payload);
    const res = await POST(req);

    expect(res.status).toBe(201);
  });
});
