import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateTaskAcceptsSubmissions,
  checkSubmissionQuota,
  checkNoActiveSubmission,
  type SubmissionTask,
} from "./submission.service";

// ── Mock Supabase client ─────────────────────────────────────

function createMockDb() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  return {
    from: vi.fn(() => chain),
    _chain: chain,
  };
}

describe("submission.service", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.restoreAllMocks();
  });

  describe("validateTaskAcceptsSubmissions", () => {
    it("returns task when open", async () => {
      mockDb._chain.single.mockResolvedValue({
        data: { id: "t1", status: "open", input_spec: "test", max_submissions_per_agent: 5, company_id: "c1", deadline: null },
        error: null,
      });

      const result = await validateTaskAcceptsSubmissions(mockDb as never, "t1");
      expect("task" in result).toBe(true);
      if ("task" in result) {
        expect(result.task.id).toBe("t1");
      }
    });

    it("returns error when task not found", async () => {
      mockDb._chain.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await validateTaskAcceptsSubmissions(mockDb as never, "missing");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.status).toBe(404);
      }
    });

    it("returns error when task is closed", async () => {
      mockDb._chain.single.mockResolvedValue({
        data: { id: "t1", status: "closed", input_spec: "test", max_submissions_per_agent: 5, company_id: "c1", deadline: null },
        error: null,
      });

      const result = await validateTaskAcceptsSubmissions(mockDb as never, "t1");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.code).toBe("TASK_NOT_OPEN");
      }
    });
  });

  describe("checkSubmissionQuota", () => {
    const task: SubmissionTask = {
      id: "t1",
      status: "open",
      input_spec: "test",
      max_submissions_per_agent: 3,
      company_id: "c1",
      deadline: null,
    };

    it("returns quota when under limit", async () => {
      mockDb._chain.single.mockResolvedValue({ data: null, error: null });
      // Override for count query — head:true returns count, not data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDb.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
          }),
        }),
      });

      const result = await checkSubmissionQuota(mockDb as never, "t1", "a1", task);
      expect("quota" in result).toBe(true);
      if ("quota" in result) {
        expect(result.quota.used).toBe(1);
        expect(result.quota.limit).toBe(3);
        expect(result.quota.remaining).toBe(2);
      }
    });

    it("returns error when quota exhausted", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDb.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
          }),
        }),
      });

      const result = await checkSubmissionQuota(mockDb as never, "t1", "a1", task);
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.code).toBe("QUOTA_EXHAUSTED");
      }
    });
  });

  describe("checkNoActiveSubmission", () => {
    it("returns null when no active submission", async () => {
      mockDb._chain.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await checkNoActiveSubmission(mockDb as never, "t1", "a1");
      expect(result).toBeNull();
    });

    it("returns error when active submission exists", async () => {
      mockDb._chain.maybeSingle.mockResolvedValue({
        data: { id: "s1", status: "running" },
        error: null,
      });

      const result = await checkNoActiveSubmission(mockDb as never, "t1", "a1");
      expect(result).not.toBeNull();
      expect(result?.code).toBe("SUBMISSION_IN_PROGRESS");
    });
  });
});
