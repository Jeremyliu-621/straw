import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockCompanyUser,
  mockAgentUser,
  makeGetRequest,
  parseJsonResponse,
  futureDeadline,
  pastDeadline,
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

const { GET } = await import("@/app/api/v1/tasks/[id]/leaderboard/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ────────────────────────────────────────────────────

describe("GET /api/v1/tasks/[id]/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(callCounters).forEach((k) => delete callCounters[k]);
    Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
    mockUser = mockAgentUser();
  });

  describe("authentication", () => {
    it("returns 401 when unauthenticated", async () => {
      mockUser = null;
      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard"
      );
      const res = await GET(req, makeParams(UUID.task1));

      expect(res.status).toBe(401);
    });
  });

  describe("validation", () => {
    it("rejects invalid UUID for task ID", async () => {
      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/not-uuid/leaderboard"
      );
      const res = await GET(req, makeParams("not-uuid"));
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).code).toBe("INVALID_UUID");
    });
  });

  describe("access control", () => {
    it("returns 404 when task does not exist", async () => {
      pushMockResult("tasks", { data: null, error: { code: "PGRST116" } });

      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard"
      );
      const res = await GET(req, makeParams(UUID.task1));

      expect(res.status).toBe(404);
    });

    it("returns 400 when task is still a draft", async () => {
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1,
          status: "draft",
          deadline: futureDeadline(),
        },
        error: null,
      });

      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard"
      );
      const res = await GET(req, makeParams(UUID.task1));

      expect(res.status).toBe(400);
    });
  });

  describe("happy path", () => {
    it("returns sorted leaderboard with anonymized agents before deadline", async () => {
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1,
          status: "open",
          deadline: futureDeadline(72),
          eval_mode: "llm",
        },
        error: null,
      });

      pushMockResult("submissions", {
        data: [
          {
            id: UUID.submission1,
            agent_id: UUID.agent1,
            created_at: "2024-01-01T00:00:00Z",
            evaluation_results: { final_score: 85, test_score: 80, llm_score: 90 },
          },
          {
            id: UUID.submission2,
            agent_id: UUID.user2,
            created_at: "2024-01-02T00:00:00Z",
            evaluation_results: { final_score: 92, test_score: 90, llm_score: 94 },
          },
        ],
        error: null,
      });

      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard"
      );
      const res = await GET(req, makeParams(UUID.task1));
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect(body).toHaveProperty("entries");
      expect(body).toHaveProperty("revealed");
      expect(body.revealed).toBe(false);

      const entries = body.entries as Array<Record<string, unknown>>;
      expect(entries.length).toBe(2);

      // Sorted by score descending
      expect(entries[0].rank).toBe(1);
      expect(entries[0].finalScore).toBe(92);
      expect(entries[1].rank).toBe(2);
      expect(entries[1].finalScore).toBe(85);

      // Anonymized — agentId should be empty
      expect(entries[0].agentId).toBe("");
      expect(entries[1].agentId).toBe("");
      expect((entries[0].agentName as string).startsWith("Agent")).toBe(true);
    });

    it("returns empty leaderboard when no submissions", async () => {
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1,
          status: "open",
          deadline: futureDeadline(),
          eval_mode: "llm",
        },
        error: null,
      });
      pushMockResult("submissions", { data: [], error: null });

      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard"
      );
      const res = await GET(req, makeParams(UUID.task1));
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect((body.entries as unknown[]).length).toBe(0);
    });
  });

  describe("response shape", () => {
    it("includes all required response fields", async () => {
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1,
          status: "open",
          deadline: futureDeadline(),
          eval_mode: "llm",
        },
        error: null,
      });
      pushMockResult("submissions", { data: [], error: null });

      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard"
      );
      const res = await GET(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      expect(body).toHaveProperty("entries");
      expect(body).toHaveProperty("revealed");
      expect(body).toHaveProperty("deadline");
      expect(body).toHaveProperty("taskStatus");
      expect(body).toHaveProperty("evalMode");
      expect(body).toHaveProperty("isOwner");
    });

    it("sets isOwner correctly for the task owner", async () => {
      mockUser = mockCompanyUser();
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1, // Same as mockCompanyUser
          status: "open",
          deadline: futureDeadline(),
          eval_mode: "llm",
        },
        error: null,
      });
      pushMockResult("submissions", { data: [], error: null });

      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard"
      );
      const res = await GET(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      expect(body.isOwner).toBe(true);
    });

    it("sets isOwner to false for non-owners", async () => {
      mockUser = mockAgentUser();
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1, // Different from agent user
          status: "open",
          deadline: futureDeadline(),
          eval_mode: "llm",
        },
        error: null,
      });
      pushMockResult("submissions", { data: [], error: null });

      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard"
      );
      const res = await GET(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      expect(body.isOwner).toBe(false);
    });
  });

  describe("deduplication", () => {
    it("shows only the best score per agent", async () => {
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1,
          status: "open",
          deadline: futureDeadline(),
          eval_mode: "llm",
        },
        error: null,
      });

      // Same agent, two submissions with different scores
      pushMockResult("submissions", {
        data: [
          {
            id: UUID.submission1,
            agent_id: UUID.agent1,
            created_at: "2024-01-01T00:00:00Z",
            evaluation_results: { final_score: 70, test_score: 65, llm_score: 75 },
          },
          {
            id: UUID.submission2,
            agent_id: UUID.agent1,
            created_at: "2024-01-02T00:00:00Z",
            evaluation_results: { final_score: 90, test_score: 85, llm_score: 95 },
          },
        ],
        error: null,
      });

      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard"
      );
      const res = await GET(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      const entries = body.entries as Array<Record<string, unknown>>;
      // Only one entry per agent (best score)
      expect(entries.length).toBe(1);
      expect(entries[0].finalScore).toBe(90);
    });
  });
});
