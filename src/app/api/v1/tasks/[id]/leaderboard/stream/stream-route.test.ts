import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockAgentUser,
  makeGetRequest,
} from "@/test/api-test-helpers";
import type { AuthenticatedUser } from "@/lib/auth-unified";
import type { LeaderboardPayload, LeaderboardFetchError } from "@/services/leaderboard.service";
import { TASK_STATUS } from "@/constants";

// ── Mocks ────────────────────────────────────────────────────

let mockUser: AuthenticatedUser | null = null;

vi.mock("@/lib/auth-unified", () => ({
  authenticateRequest: vi.fn(() => Promise.resolve(mockUser)),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(() => ({})),
}));

let mockSequence: Array<LeaderboardPayload | LeaderboardFetchError> = [];
let callCount = 0;

vi.mock("@/services/leaderboard.service", async () => {
  const actual = await vi.importActual<typeof import("@/services/leaderboard.service")>(
    "@/services/leaderboard.service"
  );
  return {
    ...actual,
    buildLeaderboard: vi.fn(() => {
      const next = mockSequence[callCount] ?? mockSequence[mockSequence.length - 1];
      callCount += 1;
      return Promise.resolve(next);
    }),
  };
});

const { GET } = await import("@/app/api/v1/tasks/[id]/leaderboard/stream/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePayload(overrides: Partial<LeaderboardPayload> = {}): LeaderboardPayload {
  return {
    entries: [
      {
        rank: 1,
        agentId: "",
        agentName: "Agent 1",
        finalScore: 92,
        testScore: null,
        llmScore: 92,
        submissionId: "",
        submittedAt: "2026-04-24T20:00:00Z",
      },
    ],
    revealed: false,
    deadline: "2026-04-25T20:00:00Z",
    taskStatus: TASK_STATUS.OPEN,
    evalMode: "llm",
    isOwner: false,
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

describe("GET /api/v1/tasks/[id]/leaderboard/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = mockAgentUser();
    mockSequence = [];
    callCount = 0;
  });

  describe("auth + validation", () => {
    it("returns 401 unauthenticated", async () => {
      mockUser = null;
      const req = makeGetRequest("http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard/stream");
      const res = await GET(req, makeParams(UUID.task1));
      expect(res.status).toBe(401);
    });

    it("returns 400 for malformed task ID", async () => {
      const req = makeGetRequest("http://localhost:3000/api/v1/tasks/not-a-uuid/leaderboard/stream");
      const res = await GET(req, makeParams("not-a-uuid"));
      expect(res.status).toBe(400);
    });

    it("returns 404 when task is missing", async () => {
      mockSequence = [{ kind: "not_found" }];
      const req = makeGetRequest("http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard/stream");
      const res = await GET(req, makeParams(UUID.task1));
      expect(res.status).toBe(404);
    });

    it("returns 400 for draft task", async () => {
      mockSequence = [{ kind: "draft" }];
      const req = makeGetRequest("http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard/stream");
      const res = await GET(req, makeParams(UUID.task1));
      expect(res.status).toBe(400);
    });
  });

  describe("streaming", () => {
    it("emits initial leaderboard event with current snapshot", async () => {
      mockSequence = [makePayload()];
      const req = makeGetRequest("http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard/stream");
      const res = await GET(req, makeParams(UUID.task1));

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");

      const body = await readStreamFully(res.body!, 500);
      expect(body).toContain("event: leaderboard");
      expect(body).toContain('"finalScore":92');
    });

    it("emits terminal event when task is already closed at open", async () => {
      mockSequence = [makePayload({ taskStatus: TASK_STATUS.CLOSED, revealed: true })];
      const req = makeGetRequest("http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/leaderboard/stream");
      const res = await GET(req, makeParams(UUID.task1));

      const body = await readStreamFully(res.body!, 500);
      expect(body).toContain("event: terminal");
      expect(body).toContain('"taskStatus":"closed"');
    });
  });
});
