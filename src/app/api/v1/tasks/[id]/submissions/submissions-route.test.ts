import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockCompanyUser,
  mockAgentUser,
  makeGetRequest,
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
  buildSubmissionCreatedPayload: vi.fn(() => ({})),
}));

vi.mock("@/db/audit-log", () => ({
  AuditLogRepository: class {
    log() {
      return Promise.resolve(undefined);
    }
  },
}));

// Mock createSubmission from service layer
let mockCreateSubmissionResult: unknown = null;

vi.mock("@/services/submission.service", () => ({
  createSubmission: vi.fn(() => Promise.resolve(mockCreateSubmissionResult)),
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

const { GET, POST } = await import("@/app/api/v1/tasks/[id]/submissions/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ────────────────────────────────────────────────────

describe("POST /api/v1/tasks/[id]/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(callCounters).forEach((k) => delete callCounters[k]);
    Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
    mockUser = mockAgentUser();
    mockCreateSubmissionResult = null;
  });

  describe("authentication", () => {
    it("returns 401 when unauthenticated", async () => {
      mockUser = null;
      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(401);
    });
  });

  describe("validation", () => {
    it("rejects display name over 100 characters", async () => {
      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions",
        { agent_display_name: "x".repeat(101) }
      );
      const res = await POST(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).code).toBe("VALIDATION_ERROR");
    });

    it("rejects empty display name string", async () => {
      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions",
        { agent_display_name: "" }
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(400);
    });

    it("accepts empty body (display name is optional)", async () => {
      mockCreateSubmissionResult = {
        submission: { id: UUID.submission1, status: "registered" },
        quota: { used: 1, limit: 5, remaining: 4 },
        uploadUrl: "https://upload.url",
        uploadToken: "token-123",
        uploadExpiresAt: "2025-01-01T00:00:00Z",
      };

      pushMockResult("tasks", {
        data: { company_id: UUID.user1 },
        error: null,
      });

      // Use a request with no body at all
      const req = new Request(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer straw_sk_test123",
          },
        }
      );

      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(201);
    });
  });

  describe("happy path", () => {
    it("creates a submission and returns upload URL with 201", async () => {
      mockCreateSubmissionResult = {
        submission: {
          id: UUID.submission1,
          task_id: UUID.task1,
          agent_id: UUID.agent1,
          status: "registered",
          mode: "upload",
        },
        quota: { used: 1, limit: 5, remaining: 4 },
        uploadUrl: "https://storage.supabase.io/signed-upload-url",
        uploadToken: "upload-token-abc",
        uploadExpiresAt: "2025-01-02T00:00:00Z",
      };

      pushMockResult("tasks", {
        data: { company_id: UUID.user1 },
        error: null,
      });

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions",
        { agent_display_name: "MyBot-v3" }
      );
      const res = await POST(req, makeParams(UUID.task1));
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(201);
      expect(body.id).toBe(UUID.submission1);
      expect(body).toHaveProperty("upload_url");
      expect(body).toHaveProperty("upload_token");
      expect(body).toHaveProperty("upload_expires_at");
      expect(body).toHaveProperty("quota");
    });
  });

  describe("service errors", () => {
    it("returns error when createSubmission service returns error", async () => {
      mockCreateSubmissionResult = {
        error: "Task is not accepting submissions",
        status: 400,
      };

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).message).toBe(
        "Task is not accepting submissions"
      );
    });

    it("returns 403 when agent tries to submit to own task", async () => {
      mockCreateSubmissionResult = {
        error: "You cannot submit to your own task",
        status: 403,
      };

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(403);
    });

    it("returns error when quota is exhausted", async () => {
      mockCreateSubmissionResult = {
        error: "Submission quota exhausted",
        status: 429,
      };

      const req = makeJsonRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions",
        {}
      );
      const res = await POST(req, makeParams(UUID.task1));

      expect(res.status).toBe(429);
    });
  });
});

describe("GET /api/v1/tasks/[id]/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(callCounters).forEach((k) => delete callCounters[k]);
    Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
    mockUser = mockCompanyUser();
  });

  describe("authentication", () => {
    it("returns 401 when unauthenticated", async () => {
      mockUser = null;
      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions"
      );
      const res = await GET(req, makeParams(UUID.task1));

      expect(res.status).toBe(401);
    });
  });

  describe("validation", () => {
    it("rejects invalid UUID for task ID", async () => {
      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/bad-id/submissions"
      );
      const res = await GET(req, makeParams("bad-id"));
      const { body } = await parseJsonResponse(res);

      expect(res.status).toBe(400);
      expect((body.error as Record<string, unknown>).code).toBe("INVALID_UUID");
    });
  });

  describe("permissions", () => {
    it("returns 404 when task does not exist", async () => {
      pushMockResult("tasks", { data: null, error: { code: "PGRST116" } });

      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions"
      );
      const res = await GET(req, makeParams(UUID.task1));

      expect(res.status).toBe(404);
    });

    it("returns 403 when not the task owner", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user2 },
        error: null,
      });

      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions"
      );
      const res = await GET(req, makeParams(UUID.task1));

      expect(res.status).toBe(403);
    });
  });

  describe("happy path", () => {
    it("returns paginated submissions for task owner", async () => {
      pushMockResult("tasks", {
        data: { id: UUID.task1, company_id: UUID.user1 },
        error: null,
      });

      pushMockResult("submissions", {
        data: [
          {
            id: UUID.submission1,
            agent_id: UUID.agent1,
            agent_display_name: "Bot1",
            status: "completed",
            mode: "upload",
            created_at: "2024-01-01T00:00:00Z",
            completed_at: "2024-01-01T01:00:00Z",
            evaluation_results: { final_score: 85, test_score: 80, llm_score: 90 },
          },
        ],
        error: null,
      });

      const req = makeGetRequest(
        "http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/submissions"
      );
      const res = await GET(req, makeParams(UUID.task1));
      const { status, body } = await parseJsonResponse(res);

      expect(status).toBe(200);
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("pagination");
    });
  });
});
