import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockAgentUser,
  makeGetRequest,
} from "@/test/api-test-helpers";
import type { AuthenticatedUser } from "@/lib/auth-unified";
import type { SubmissionDetail, SubmissionFetchError } from "@/services/submission.service";

// ── Mocks ────────────────────────────────────────────────────

let mockUser: AuthenticatedUser | null = null;

vi.mock("@/lib/auth-unified", () => ({
  authenticateRequest: vi.fn(() => Promise.resolve(mockUser)),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(() => ({})),
}));

let mockFetchSequence: Array<SubmissionDetail | SubmissionFetchError> = [];
let fetchCallCount = 0;

vi.mock("@/services/submission.service", async () => {
  const actual = await vi.importActual<typeof import("@/services/submission.service")>(
    "@/services/submission.service"
  );
  return {
    ...actual,
    fetchSubmissionDetail: vi.fn(() => {
      const next = mockFetchSequence[fetchCallCount] ?? mockFetchSequence[mockFetchSequence.length - 1];
      fetchCallCount += 1;
      return Promise.resolve(next);
    }),
  };
});

const { GET } = await import("@/app/api/v1/submissions/[id]/stream/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeDetail(overrides: Partial<SubmissionDetail> = {}): SubmissionDetail {
  return {
    id: UUID.submission1,
    task_id: UUID.task1,
    status: "running",
    mode: "upload",
    agent_display_name: "agent-7",
    created_at: "2026-04-24T20:00:00Z",
    started_at: "2026-04-24T20:00:01Z",
    completed_at: null,
    error_message: null,
    evaluated: false,
    scores: null,
    dimensions: [],
    position: null,
    quota: { used: 1, limit: 15, remaining: 14 },
    ...overrides,
  };
}

async function readStreamFully(stream: ReadableStream<Uint8Array>, capMs = 1000): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  // Force-cancel after capMs so a long-poll runner doesn't block the test.
  const cancelTimer = setTimeout(() => { reader.cancel().catch(() => {}); }, capMs);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      out += decoder.decode(value);
    }
  } finally {
    clearTimeout(cancelTimer);
  }
  return out;
}

// ── Tests ────────────────────────────────────────────────────

describe("GET /api/v1/submissions/[id]/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = mockAgentUser();
    mockFetchSequence = [];
    fetchCallCount = 0;
  });

  describe("auth + ownership", () => {
    it("returns 401 when unauthenticated", async () => {
      mockUser = null;
      const req = makeGetRequest("http://localhost:3000/api/v1/submissions/" + UUID.submission1 + "/stream");
      const res = await GET(req, makeParams(UUID.submission1));
      expect(res.status).toBe(401);
    });

    it("returns 404 when submission is missing (no stream opened)", async () => {
      mockFetchSequence = [{ kind: "not_found" }];
      const req = makeGetRequest("http://localhost:3000/api/v1/submissions/" + UUID.submission1 + "/stream");
      const res = await GET(req, makeParams(UUID.submission1));
      expect(res.status).toBe(404);
    });

    it("returns 403 when caller does not own the submission", async () => {
      mockFetchSequence = [{ kind: "forbidden" }];
      const req = makeGetRequest("http://localhost:3000/api/v1/submissions/" + UUID.submission1 + "/stream");
      const res = await GET(req, makeParams(UUID.submission1));
      expect(res.status).toBe(403);
    });
  });

  describe("streaming", () => {
    it("emits an initial submission event with the current detail", async () => {
      mockFetchSequence = [
        makeDetail({ status: "completed", evaluated: true, scores: {
          final_score: 87,
          test_score: null,
          llm_score: 87,
          container_score: null,
          breakdown: null,
          container_tests: null,
          container_notes: null,
          eval_mode: "llm",
          evaluated_at: "2026-04-24T20:00:30Z",
        }, position: 3 }),
      ];

      const req = makeGetRequest("http://localhost:3000/api/v1/submissions/" + UUID.submission1 + "/stream");
      const res = await GET(req, makeParams(UUID.submission1));

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");

      const body = await readStreamFully(res.body!, 500);
      expect(body).toContain("event: submission");
      expect(body).toContain("\"final_score\":87");
      expect(body).toContain("\"position\":3");
    });

    it("emits a 'terminal' event and closes when status is terminal on first poll", async () => {
      mockFetchSequence = [makeDetail({ status: "completed", evaluated: true })];

      const req = makeGetRequest("http://localhost:3000/api/v1/submissions/" + UUID.submission1 + "/stream");
      const res = await GET(req, makeParams(UUID.submission1));

      const body = await readStreamFully(res.body!, 500);
      expect(body).toContain("event: terminal");
      expect(body).toContain("\"status\":\"completed\"");
    });
  });
});
