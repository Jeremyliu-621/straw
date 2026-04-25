import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockAgentUser,
  makeGetRequest,
} from "@/test/api-test-helpers";
import type { AuthenticatedUser } from "@/lib/auth-unified";
import type { TaskEventSnapshot, TaskEventFetchError } from "@/services/task.service";
import { TASK_STATUS } from "@/constants";

// ── Mocks ────────────────────────────────────────────────────

let mockUser: AuthenticatedUser | null = null;

vi.mock("@/lib/auth-unified", () => ({
  authenticateRequest: vi.fn(() => Promise.resolve(mockUser)),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(() => ({})),
}));

let mockSequence: Array<TaskEventSnapshot | TaskEventFetchError> = [];
let callCount = 0;

vi.mock("@/services/task.service", async () => {
  const actual = await vi.importActual<typeof import("@/services/task.service")>(
    "@/services/task.service"
  );
  return {
    ...actual,
    fetchTaskEventSnapshot: vi.fn(() => {
      const next = mockSequence[callCount] ?? mockSequence[mockSequence.length - 1];
      callCount += 1;
      return Promise.resolve(next);
    }),
  };
});

const { GET } = await import("@/app/api/v1/tasks/[id]/events/stream/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeSnap(overrides: Partial<TaskEventSnapshot> = {}): TaskEventSnapshot {
  return {
    id: UUID.task1,
    status: TASK_STATUS.OPEN,
    deadline: "2026-04-25T20:00:00Z",
    title: "Build a URL shortener API",
    category: "code-generation",
    budget_cents: 50000,
    eval_mode: "llm",
    max_submissions_per_agent: 15,
    updated_at: "2026-04-24T20:00:00Z",
    server_time: "2026-04-24T23:50:00Z",
    ...overrides,
  };
}

async function readStreamFully(stream: ReadableStream<Uint8Array>, capMs = 800): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
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

describe("GET /api/v1/tasks/[id]/events/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = mockAgentUser();
    mockSequence = [];
    callCount = 0;
  });

  it("returns 401 unauthenticated", async () => {
    mockUser = null;
    const req = makeGetRequest("http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/events/stream");
    const res = await GET(req, makeParams(UUID.task1));
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed task ID", async () => {
    const req = makeGetRequest("http://localhost:3000/api/v1/tasks/not-uuid/events/stream");
    const res = await GET(req, makeParams("not-uuid"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when task is missing", async () => {
    mockSequence = [{ kind: "not_found" }];
    const req = makeGetRequest("http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/events/stream");
    const res = await GET(req, makeParams(UUID.task1));
    expect(res.status).toBe(404);
  });

  it("emits an initial task event with the snapshot", async () => {
    mockSequence = [makeSnap()];
    const req = makeGetRequest("http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/events/stream");
    const res = await GET(req, makeParams(UUID.task1));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");

    const body = await readStreamFully(res.body!, 500);
    expect(body).toContain("event: task");
    expect(body).toContain('"status":"open"');
    expect(body).toContain('"max_submissions_per_agent":15');
  });

  it("emits terminal event when task is already closed at open", async () => {
    mockSequence = [makeSnap({ status: TASK_STATUS.CLOSED })];
    const req = makeGetRequest("http://localhost:3000/api/v1/tasks/" + UUID.task1 + "/events/stream");
    const res = await GET(req, makeParams(UUID.task1));

    const body = await readStreamFully(res.body!, 500);
    expect(body).toContain("event: terminal");
    expect(body).toContain('"status":"closed"');
  });
});
