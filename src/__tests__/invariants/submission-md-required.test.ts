/**
 * INVARIANT: Every submission must include a SUBMISSION.md file.
 *
 * REQUIREMENTS.md:146 non-negotiable:
 *   "Every submission must include SUBMISSION.md following the structured template."
 *
 * The /api/v1/submissions/[id]/complete route is the enforcement point.
 * It must reject the completion with 400 MISSING_SUBMISSION_MD if the
 * uploaded artifact doesn't include SUBMISSION.md.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockAgentUser,
  makeJsonRequest,
  parseJsonResponse,
} from "@/test/api-test-helpers";
import type { AuthenticatedUser } from "@/lib/auth-unified";

let mockUser: AuthenticatedUser | null = null;

vi.mock("@/lib/auth-unified", () => ({
  authenticateRequest: vi.fn(() => Promise.resolve(mockUser)),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitResponse: vi.fn(() => null),
}));

// Upload service mocks — toggle per test.
let uploadExists = true;
let submissionMdPresent = false;

vi.mock("@/services/upload.service", async () => {
  const actual = await vi.importActual<typeof import("@/services/upload.service")>(
    "@/services/upload.service"
  );
  return {
    ...actual,
    verifyUploadExists: vi.fn(() => Promise.resolve(uploadExists)),
    verifySubmissionMd: vi.fn(() => Promise.resolve(submissionMdPresent)),
    getSubmissionStoragePath: vi.fn((id: string) => `submissions/${id}`),
  };
});

// BullMQ mock — complete route enqueues an evaluation job.
vi.mock("@/lib/queue", () => ({
  createEvaluationQueue: vi.fn(() => ({
    add: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("@/lib/env", () => ({
  env: { REDIS_URL: "redis://localhost:6379" },
}));

vi.mock("@/db/audit-log", () => ({
  AuditLogRepository: class {
    log() { return Promise.resolve(); }
  },
}));

// Supabase mock plumbing
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
  for (const m of ["select", "eq", "order", "limit", "gt", "lt", "in", "or", "is", "update", "insert", "delete"]) {
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
  })),
}));

const { POST: completeSubmission } = await import(
  "@/app/api/v1/submissions/[id]/complete/route"
);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(callCounters).forEach((k) => delete callCounters[k]);
  Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
  uploadExists = true;
  submissionMdPresent = false;
  mockUser = mockAgentUser();
});

describe("invariant: SUBMISSION.md is required on every submission", () => {
  it("returns 400 MISSING_SUBMISSION_MD when the uploaded zip has no SUBMISSION.md", async () => {
    submissionMdPresent = false;

    pushMockResult("submissions", {
      data: {
        id: UUID.submission1,
        agent_id: UUID.agent1,
        task_id: UUID.task1,
        status: "registered",
        mode: "upload",
      },
      error: null,
    });
    pushMockResult("tasks", {
      data: { deadline: new Date(Date.now() + 86400000).toISOString() },
      error: null,
    });

    const req = makeJsonRequest(
      `http://localhost/api/v1/submissions/${UUID.submission1}/complete`,
      {},
      "POST"
    );
    const res = await completeSubmission(req, makeParams(UUID.submission1));

    expect(res.status).toBe(400);
    const { body } = await parseJsonResponse(res);
    const err = (body as { error?: { code?: string } }).error;
    expect(err?.code).toBe("MISSING_SUBMISSION_MD");
  });

  it("allows completion when SUBMISSION.md is present", async () => {
    submissionMdPresent = true;

    pushMockResult("submissions", {
      data: {
        id: UUID.submission1,
        agent_id: UUID.agent1,
        task_id: UUID.task1,
        status: "registered",
        mode: "upload",
      },
      error: null,
    });
    pushMockResult("tasks", {
      data: { deadline: new Date(Date.now() + 86400000).toISOString() },
      error: null,
    });
    // submission update in the happy path — response data not read
    pushMockResult("submissions", { data: null, error: null });

    const req = makeJsonRequest(
      `http://localhost/api/v1/submissions/${UUID.submission1}/complete`,
      {},
      "POST"
    );
    const res = await completeSubmission(req, makeParams(UUID.submission1));

    expect(res.status).toBe(202);
  });
});
