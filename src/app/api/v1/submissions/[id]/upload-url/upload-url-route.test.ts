import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockAgentUser,
} from "@/test/api-test-helpers";
import type { AuthenticatedUser } from "@/lib/auth-unified";

let mockUser: AuthenticatedUser | null = null;

vi.mock("@/lib/auth-unified", () => ({
  authenticateRequest: vi.fn(() => Promise.resolve(mockUser)),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitResponse: vi.fn(() => null),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(() => ({})),
}));

const refreshMock = vi.fn();

vi.mock("@/services/submission.service", async () => {
  const actual = await vi.importActual<typeof import("@/services/submission.service")>(
    "@/services/submission.service"
  );
  return {
    ...actual,
    refreshSubmissionUploadUrl: (...args: unknown[]) => refreshMock(...args),
  };
});

const { POST } = await import("@/app/api/v1/submissions/[id]/upload-url/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function postReq() {
  return new Request("http://localhost:3000/api/v1/submissions/" + UUID.submission1 + "/upload-url", { method: "POST" });
}

describe("POST /api/v1/submissions/[id]/upload-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = mockAgentUser();
    refreshMock.mockReset();
  });

  it("returns 401 unauthenticated", async () => {
    mockUser = null;
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(401);
  });

  it("returns 404 when submission not found", async () => {
    refreshMock.mockResolvedValue({ kind: "not_found" });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(404);
  });

  it("returns 403 when caller is not the owner", async () => {
    refreshMock.mockResolvedValue({ kind: "forbidden" });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(403);
  });

  it("returns 409 WRONG_STATUS when submission is past registered", async () => {
    refreshMock.mockResolvedValue({ kind: "wrong_status", status: "running" });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("WRONG_STATUS");
    expect(body.error.details.status).toBe("running");
  });

  it("returns 409 ALREADY_UPLOADED when artifact already exists", async () => {
    refreshMock.mockResolvedValue({ kind: "already_uploaded" });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("ALREADY_UPLOADED");
  });

  it("returns 409 TASK_CLOSED when parent task is closed", async () => {
    refreshMock.mockResolvedValue({ kind: "task_closed" });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("TASK_CLOSED");
  });

  it("returns 200 + presigned info on the happy path", async () => {
    refreshMock.mockResolvedValue({
      submission_id: UUID.submission1,
      upload_url: "https://supabase.example.com/signed-upload?token=abc",
      upload_token: "abc",
      upload_path: `submissions/${UUID.submission1}/agent_output`,
      upload_expires_at: "2026-04-25T13:00:00Z",
    });
    const res = await POST(postReq(), makeParams(UUID.submission1));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.upload_url).toContain("signed-upload");
    expect(body.upload_path).toContain("agent_output");
    expect(refreshMock).toHaveBeenCalledWith(expect.anything(), UUID.submission1, expect.any(String));
  });
});
