import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockAgentUser,
  makeGetRequest,
} from "@/test/api-test-helpers";
import type { AuthenticatedUser } from "@/lib/auth-unified";

let mockUser: AuthenticatedUser | null = null;

vi.mock("@/lib/auth-unified", () => ({
  authenticateRequest: vi.fn(() => Promise.resolve(mockUser)),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitResponse: vi.fn(() => null),
}));

vi.mock("@/lib/queue", () => ({
  createEvaluationQueue: vi.fn(() => ({
    add: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  })),
  buildRedisConnection: vi.fn(() => ({})),
}));

vi.mock("@/lib/env", () => ({
  env: { REDIS_URL: "redis://x" },
}));

vi.mock("@/db/audit-log", () => ({
  AuditLogRepository: class {
    log = vi.fn(() => Promise.resolve(undefined));
  },
}));

const eligibilityMock = vi.fn();
const clearMock = vi.fn();

vi.mock("@/services/submission.service", async () => {
  const actual = await vi.importActual<typeof import("@/services/submission.service")>(
    "@/services/submission.service"
  );
  return {
    ...actual,
    checkReEvalEligibility: (...args: unknown[]) => eligibilityMock(...args),
    clearSubmissionForReEval: (...args: unknown[]) => clearMock(...args),
  };
});

vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(() => ({})),
}));

const { POST } = await import("@/app/api/v1/submissions/[id]/request_re_eval/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function postReq() {
  return new Request("http://localhost:3000/api/v1/submissions/" + UUID.submission1 + "/request_re_eval", { method: "POST" });
}

describe("POST /api/v1/submissions/[id]/request_re_eval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = mockAgentUser();
    eligibilityMock.mockReset();
    clearMock.mockReset();
    clearMock.mockResolvedValue({ ok: true });
  });

  it("returns 401 when unauthenticated", async () => {
    mockUser = null;
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(401);
  });

  it("returns 404 when submission not found", async () => {
    eligibilityMock.mockResolvedValue({ kind: "not_found" });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(404);
  });

  it("returns 403 when caller is not the owner", async () => {
    eligibilityMock.mockResolvedValue({ kind: "forbidden" });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(403);
  });

  it("returns 409 when task is closed", async () => {
    eligibilityMock.mockResolvedValue({ kind: "task_closed" });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("TASK_CLOSED");
  });

  it("returns 409 when submission status is not eligible", async () => {
    eligibilityMock.mockResolvedValue({ kind: "wrong_status", status: "running" });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("WRONG_STATUS");
    expect(body.error.details.status).toBe("running");
  });

  it("returns 429 when in cooldown", async () => {
    eligibilityMock.mockResolvedValue({ kind: "cooldown", retry_after_ms: 600_000 });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RE_EVAL_COOLDOWN");
    expect(body.error.details.retry_after_ms).toBe(600_000);
  });

  it("returns 409 when submission has no artifact", async () => {
    eligibilityMock.mockResolvedValue({ kind: "no_artifact" });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("NO_ARTIFACT");
  });

  it("returns 202 with iteration info on the happy path", async () => {
    eligibilityMock.mockResolvedValue({
      ok: true,
      submission: {
        id: UUID.submission1,
        task_id: UUID.task1,
        status: "completed",
        output_url: "submissions/abc/file.zip",
      },
      iteration: 1,
    });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.submission_id).toBe(UUID.submission1);
    expect(body.iteration).toBe(1);
    expect(body.enqueued_at).toBeTruthy();
    expect(clearMock).toHaveBeenCalledWith(expect.anything(), UUID.submission1);
  });
});
