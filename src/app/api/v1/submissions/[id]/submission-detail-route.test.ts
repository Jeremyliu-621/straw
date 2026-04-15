import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockAgentUser,
  mockCompanyUser,
  makeGetRequest,
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
const mockResultsByTable: Record<string, Array<{ data: unknown; error: unknown; count?: number }>> = {};

function pushMockResult(table: string, result: { data: unknown; error: unknown; count?: number }) {
  if (!mockResultsByTable[table]) mockResultsByTable[table] = [];
  mockResultsByTable[table].push(result);
}

function nextMockResult(table: string): { data: unknown; error: unknown; count?: number } {
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

const { GET } = await import("@/app/api/v1/submissions/[id]/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ────────────────────────────────────────────────────

describe("GET /api/v1/submissions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(callCounters).forEach((k) => delete callCounters[k]);
    Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
    mockUser = mockAgentUser();
  });

  describe("authentication", () => {
    it("returns 401 when unauthenticated", async () => {
      mockUser = null;
      const req = makeGetRequest("http://localhost:3000/api/v1/submissions/" + UUID.submission1);
      const res = await GET(req, makeParams(UUID.submission1));

      expect(res.status).toBe(401);
    });
  });

  describe("access control", () => {
    it("returns 404 when submission does not exist", async () => {
      pushMockResult("submissions", { data: null, error: { code: "PGRST116" } });

      const req = makeGetRequest("http://localhost:3000/api/v1/submissions/" + UUID.submission1);
      const res = await GET(req, makeParams(UUID.submission1));

      expect(res.status).toBe(404);
    });

    it("returns 403 when user is not the submission owner", async () => {
      pushMockResult("submissions", {
        data: {
          id: UUID.submission1,
          task_id: UUID.task1,
          agent_id: UUID.user2, // Different from mockAgentUser's ID
          status: "completed",
          mode: "upload",
          agent_display_name: null,
          output_url: null,
          error_message: null,
          started_at: null,
          completed_at: null,
          created_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      const req = makeGetRequest("http://localhost:3000/api/v1/submissions/" + UUID.submission1);
      const res = await GET(req, makeParams(UUID.submission1));
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(403);
      expect((body.error as Record<string, unknown>).message).toBe("Not your submission");
    });
  });

  describe("happy path", () => {
    it("returns submission detail with scores when evaluated", async () => {
      // Submission fetch
      pushMockResult("submissions", {
        data: {
          id: UUID.submission1,
          task_id: UUID.task1,
          agent_id: UUID.agent1,
          status: "completed",
          mode: "upload",
          agent_display_name: "MyBot",
          output_url: "https://storage/output.zip",
          error_message: null,
          started_at: "2024-01-01T01:00:00Z",
          completed_at: "2024-01-01T02:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      // Evaluation result
      pushMockResult("evaluation_results", {
        data: {
          id: "eval-1",
          test_score: 80,
          llm_score: 90,
          final_score: 85,
          container_score: null,
          breakdown: null,
          eval_mode: "llm",
          llm_reasoning: "Good work",
          created_at: "2024-01-01T03:00:00Z",
        },
        error: null,
      });

      // Evaluation dimensions
      pushMockResult("evaluation_dimensions", {
        data: [
          {
            score: 85,
            reasoning: "Clean implementation",
            rubric_criteria: { name: "Correctness", description: "Must compile" },
          },
        ],
        error: null,
      });

      // Submissions for leaderboard position
      pushMockResult("submissions", {
        data: [{ id: UUID.submission1 }],
        error: null,
      });

      // Evaluation results for position calculation
      pushMockResult("evaluation_results", {
        data: [{ submission_id: UUID.submission1, final_score: 85 }],
        error: null,
      });

      // Quota count
      pushMockResult("submissions", { data: null, error: null, count: 2 });

      // Task for max_submissions
      pushMockResult("tasks", {
        data: { max_submissions_per_agent: 5 },
        error: null,
      });

      const req = makeGetRequest("http://localhost:3000/api/v1/submissions/" + UUID.submission1);
      const res = await GET(req, makeParams(UUID.submission1));
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect(body.id).toBe(UUID.submission1);
      expect(body.evaluated).toBe(true);
      expect(body.scores).toBeDefined();
      expect(body).toHaveProperty("dimensions");
      expect(body).toHaveProperty("position");
      expect(body).toHaveProperty("quota");
    });

    it("returns submission with null scores when not yet evaluated", async () => {
      pushMockResult("submissions", {
        data: {
          id: UUID.submission1,
          task_id: UUID.task1,
          agent_id: UUID.agent1,
          status: "registered",
          mode: "upload",
          agent_display_name: null,
          output_url: null,
          error_message: null,
          started_at: null,
          completed_at: null,
          created_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      // No evaluation result
      pushMockResult("evaluation_results", { data: null, error: null });

      // Quota count (thenable path)
      pushMockResult("submissions", { data: null, error: null, count: 1 });

      // Task
      pushMockResult("tasks", {
        data: { max_submissions_per_agent: 5 },
        error: null,
      });

      const req = makeGetRequest("http://localhost:3000/api/v1/submissions/" + UUID.submission1);
      const res = await GET(req, makeParams(UUID.submission1));
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect(body.evaluated).toBe(false);
      expect(body.scores).toBeNull();
      expect(body.dimensions).toEqual([]);
      expect(body.position).toBeNull();
    });
  });

  describe("response shape", () => {
    it("includes all required fields", async () => {
      pushMockResult("submissions", {
        data: {
          id: UUID.submission1,
          task_id: UUID.task1,
          agent_id: UUID.agent1,
          status: "completed",
          mode: "upload",
          agent_display_name: null,
          output_url: null,
          error_message: null,
          started_at: null,
          completed_at: null,
          created_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });
      pushMockResult("evaluation_results", { data: null, error: null });
      pushMockResult("submissions", { data: null, error: null, count: 0 });
      pushMockResult("tasks", {
        data: { max_submissions_per_agent: 5 },
        error: null,
      });

      const req = makeGetRequest("http://localhost:3000/api/v1/submissions/" + UUID.submission1);
      const res = await GET(req, makeParams(UUID.submission1));
      const { body } = await parseJsonResponse(res);

      const requiredFields = [
        "id",
        "task_id",
        "status",
        "mode",
        "evaluated",
        "scores",
        "dimensions",
        "position",
        "quota",
        "created_at",
      ];

      for (const field of requiredFields) {
        expect(body).toHaveProperty(field);
      }
    });
  });
});
