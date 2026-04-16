import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockAgentUser,
  makeRequest,
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

vi.mock("@/db/audit-log", () => ({
  AuditLogRepository: class {
    log() {
      return Promise.resolve(undefined);
    }
  },
}));

vi.mock("@/lib/queue", () => ({
  createEvaluationQueue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  buildRedisConnection: vi.fn(() => ({})),
}));

vi.mock("@/lib/env", () => ({
  env: { REDIS_URL: "redis://localhost:6379" },
}));

vi.mock("@/services/upload.service", () => ({
  getSubmissionStoragePath: vi.fn((id: string) => `submissions/${id}`),
}));

// Per-call results keyed by table, consumed sequentially.
const callCounters: Record<string, number> = {};
const mockResultsByTable: Record<string, Array<{ data: unknown; error: unknown }>> = {};

function pushMockResult(table: string, result: { data: unknown; error: unknown }) {
  if (!mockResultsByTable[table]) mockResultsByTable[table] = [];
  mockResultsByTable[table].push(result);
}

function nextMockResult(table: string): { data: unknown; error: unknown } {
  const idx = callCounters[table] ?? 0;
  callCounters[table] = idx + 1;
  const results = mockResultsByTable[table] ?? [];
  return results[idx] ?? { data: null, error: null };
}

function createTableChain(tableName: string) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "gt", "lt", "in", "or", "update", "insert", "delete"]) {
    chain[m] = vi.fn((..._args: unknown[]) => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(nextMockResult(tableName)));
  chain.maybeSingle = vi.fn(() => Promise.resolve(nextMockResult(tableName)));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(nextMockResult(tableName)).then(resolve);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => createTableChain(table)),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  })),
}));

// ── Import handler after mocks ───────────────────────────────

const { POST } = await import("@/app/api/v1/tasks/[id]/quick-submit/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeQuickSubmitRequest(taskId: string, opts: { idempotencyKey?: string }) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.idempotencyKey !== undefined) {
    headers["Idempotency-Key"] = opts.idempotencyKey;
  }
  return makeRequest(`http://localhost:3000/api/v1/tasks/${taskId}/quick-submit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ files: { "main.py": "print('hi')" } }),
  });
}

// ── Tests ────────────────────────────────────────────────────

describe("POST /api/v1/tasks/[id]/quick-submit — idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(callCounters).forEach((k) => delete callCounters[k]);
    Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
    mockUser = mockAgentUser();
  });

  it("rejects empty Idempotency-Key header", async () => {
    // Note: Request normalizes empty header values, so we test the whitespace-only case
    // which the route strips to "" and rejects.
    const req = makeQuickSubmitRequest(UUID.task1, { idempotencyKey: "   " });
    const res = await POST(req, makeParams(UUID.task1));
    const { body } = await parseJsonResponse(res);

    expect(res.status).toBe(400);
    expect((body.error as Record<string, unknown>).code).toBe("VALIDATION_ERROR");
  });

  it("rejects Idempotency-Key longer than 255 chars", async () => {
    const req = makeQuickSubmitRequest(UUID.task1, { idempotencyKey: "x".repeat(256) });
    const res = await POST(req, makeParams(UUID.task1));
    const { body } = await parseJsonResponse(res);

    expect(res.status).toBe(400);
    expect((body.error as Record<string, unknown>).code).toBe("VALIDATION_ERROR");
  });

  it("returns the original submission on retry with matching key", async () => {
    // First lookup hits the idempotency check (maybeSingle on submissions).
    // Returning an existing row short-circuits before task / quota / upload logic.
    pushMockResult("submissions", {
      data: {
        id: UUID.submission1,
        task_id: UUID.task1,
        status: "completed",
      },
      error: null,
    });

    const req = makeQuickSubmitRequest(UUID.task1, { idempotencyKey: "retry-abc" });
    const res = await POST(req, makeParams(UUID.task1));
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(202);
    expect(body.id).toBe(UUID.submission1);
    expect(body.task_id).toBe(UUID.task1);
    expect(body.status).toBe("completed");
    expect(body.idempotent_retry).toBe(true);
    expect(body.poll_url).toBe(`/api/v1/submissions/${UUID.submission1}`);
  });

  it("no short-circuit when Idempotency-Key is absent", async () => {
    // Without a key, the idempotency lookup is skipped entirely.
    // Without mocking the full downstream chain, we expect the request to flow
    // past the idempotency check — we only assert the response is NOT the
    // idempotent-retry shape.
    pushMockResult("tasks", {
      data: null,
      error: { code: "PGRST116" },
    });

    const req = makeQuickSubmitRequest(UUID.task1, {});
    const res = await POST(req, makeParams(UUID.task1));
    const { body } = await parseJsonResponse(res);

    expect(body.idempotent_retry).toBeUndefined();
  });
});
