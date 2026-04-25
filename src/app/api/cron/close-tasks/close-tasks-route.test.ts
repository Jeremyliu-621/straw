import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeGetRequest } from "@/test/api-test-helpers";

// ── Mocks ────────────────────────────────────────────────────

vi.mock("@/lib/cron-auth", () => ({
  verifyCronRequest: vi.fn(() => true),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(() => ({})),
}));

const mockCheckDeadlines = vi.fn();
vi.mock("@/services/task-deadline.service", () => ({
  checkDeadlines: (db: unknown, enqueue?: unknown) => mockCheckDeadlines(db, enqueue),
}));

vi.mock("@/lib/webhook-dispatch", () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notification-dispatch", () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
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

vi.mock("@/services/webhook.service", () => ({
  buildTaskStatusChangedPayload: vi.fn(() => ({})),
}));

// Track queue-creation attempts so we can assert it was/wasn't called.
const mockCreateEvalQueue = vi.fn();
const mockBuildRedisConnection = vi.fn();
vi.mock("@/lib/queue", () => ({
  createEvaluationQueue: (conn: unknown) => mockCreateEvalQueue(conn),
  buildRedisConnection: (url?: string) => mockBuildRedisConnection(url),
  Queue: class {},
}));

// ── Import handlers AFTER mocks ──────────────────────────────

const { GET, POST } = await import("./route");

// ── Tests ────────────────────────────────────────────────────

describe("/api/cron/close-tasks", () => {
  const originalRedisUrl = process.env.REDIS_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckDeadlines.mockResolvedValue({
      tasksTransitionedToEvaluating: [],
      tasksTransitionedToClosed: [],
      evaluationsEnqueued: 0,
      events: [],
      errors: [],
    });
  });

  afterEach(() => {
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
  });

  it("accepts GET (Vercel Cron uses GET)", async () => {
    delete process.env.REDIS_URL;
    const req = makeGetRequest("http://localhost:3000/api/cron/close-tasks");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("accepts POST (manual trigger / external schedulers)", async () => {
    delete process.env.REDIS_URL;
    const req = new Request("http://localhost:3000/api/cron/close-tasks", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("degrades gracefully when REDIS_URL is unset (Vercel-only deploy)", async () => {
    delete process.env.REDIS_URL;
    const req = makeGetRequest("http://localhost:3000/api/cron/close-tasks");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.queue_warning).toContain("REDIS_URL not set");
    // Did NOT attempt to construct a queue
    expect(mockBuildRedisConnection).not.toHaveBeenCalled();
    expect(mockCreateEvalQueue).not.toHaveBeenCalled();
    // Passes undefined enqueue so the deadline service skips the eval step
    expect(mockCheckDeadlines).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it("degrades gracefully when buildRedisConnection throws (e.g. malformed URL)", async () => {
    process.env.REDIS_URL = "redis://example.com";
    mockBuildRedisConnection.mockImplementation(() => {
      throw new Error("malformed connection string");
    });

    const req = makeGetRequest("http://localhost:3000/api/cron/close-tasks");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.queue_warning).toContain("malformed connection string");
    expect(mockCheckDeadlines).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it("uses the queue when REDIS_URL is set and connection builds OK", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    mockBuildRedisConnection.mockReturnValue({ host: "localhost", port: 6379 });
    mockCreateEvalQueue.mockReturnValue({
      add: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    });

    const req = makeGetRequest("http://localhost:3000/api/cron/close-tasks");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.queue_warning).toBeUndefined();
    expect(mockCreateEvalQueue).toHaveBeenCalled();
    // checkDeadlines was given a real enqueue function (not undefined)
    expect(mockCheckDeadlines).toHaveBeenCalledWith(expect.anything(), expect.any(Function));
  });

  it("captures per-submission enqueue errors without failing the run", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    mockBuildRedisConnection.mockReturnValue({ host: "localhost", port: 6379 });
    const failingAdd = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    mockCreateEvalQueue.mockReturnValue({
      add: failingAdd,
      close: vi.fn().mockResolvedValue(undefined),
    });
    // Have checkDeadlines actually call the enqueue function once
    mockCheckDeadlines.mockImplementation(async (_db, enqueue) => {
      if (enqueue) await enqueue("sub-1", "task-1", "https://x/y");
      return {
        tasksTransitionedToEvaluating: ["task-1"],
        tasksTransitionedToClosed: [],
        evaluationsEnqueued: 0,
        events: [],
        errors: [],
      };
    });

    const req = makeGetRequest("http://localhost:3000/api/cron/close-tasks");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.enqueue_errors).toHaveLength(1);
    expect(body.enqueue_errors[0]).toContain("ECONNREFUSED");
    // The deadline transition still happened
    expect(body.tasksTransitionedToEvaluating).toEqual(["task-1"]);
  });

  it("returns 401 when verifyCronRequest fails", async () => {
    const { verifyCronRequest } = await import("@/lib/cron-auth");
    (verifyCronRequest as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const req = makeGetRequest("http://localhost:3000/api/cron/close-tasks");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
