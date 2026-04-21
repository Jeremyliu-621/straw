import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generatePresignedUploadUrl,
  verifyUploadExists,
  verifySubmissionMd,
  getSubmissionStoragePath,
} from "./upload.service";

// ── Mock Supabase client ─────────────────────────────────────

function createMockDb() {
  const mockStorage = {
    createSignedUploadUrl: vi.fn(),
    list: vi.fn(),
  };

  return {
    storage: {
      from: vi.fn(() => mockStorage),
    },
    _mockStorage: mockStorage,
  };
}

describe("upload.service", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.restoreAllMocks();
  });

  describe("generatePresignedUploadUrl", () => {
    it("generates a presigned URL with correct path", async () => {
      mockDb._mockStorage.createSignedUploadUrl.mockResolvedValue({
        data: {
          signedUrl: "https://storage.example.com/signed",
          token: "tok_abc",
          path: "submissions/sub-123/agent_output",
        },
        error: null,
      });

      const result = await generatePresignedUploadUrl(
        mockDb as never,
        "sub-123"
      );

      expect(result.signedUrl).toBe("https://storage.example.com/signed");
      expect(result.token).toBe("tok_abc");
      expect(result.path).toBe("submissions/sub-123/agent_output");
      expect(result.expiresAt).toBeTruthy();
      expect(mockDb.storage.from).toHaveBeenCalledWith("agent-outputs");
      expect(mockDb._mockStorage.createSignedUploadUrl).toHaveBeenCalledWith(
        "submissions/sub-123/agent_output"
      );
    });

    it("throws on storage error", async () => {
      mockDb._mockStorage.createSignedUploadUrl.mockResolvedValue({
        data: null,
        error: { message: "bucket not found" },
      });

      await expect(
        generatePresignedUploadUrl(mockDb as never, "sub-123")
      ).rejects.toThrow("Failed to create presigned upload URL: bucket not found");
    });

    it("respects deadline for expiry", async () => {
      const futureDeadline = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour
      mockDb._mockStorage.createSignedUploadUrl.mockResolvedValue({
        data: { signedUrl: "url", token: "tok", path: "p" },
        error: null,
      });

      const result = await generatePresignedUploadUrl(
        mockDb as never,
        "sub-123",
        futureDeadline
      );

      // Expiry should be ~1 hour from now, not 24 hours
      const expiresMs = new Date(result.expiresAt).getTime() - Date.now();
      expect(expiresMs).toBeLessThan(3700 * 1000); // within 1h + margin
      expect(expiresMs).toBeGreaterThan(3500 * 1000); // at least ~58 min
    });

    it("caps expiry at Supabase's 2h server-side maximum", async () => {
      // Deadline is 24h out, but Supabase won't honour > 2h. The displayed
      // expiresAt must not lie — cap it at 2h.
      const farFutureDeadline = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      mockDb._mockStorage.createSignedUploadUrl.mockResolvedValue({
        data: { signedUrl: "url", token: "tok", path: "p" },
        error: null,
      });

      const result = await generatePresignedUploadUrl(
        mockDb as never,
        "sub-123",
        farFutureDeadline
      );

      const expiresMs = new Date(result.expiresAt).getTime() - Date.now();
      // At most 2h plus a small margin for test execution.
      expect(expiresMs).toBeLessThanOrEqual(2 * 3600 * 1000 + 1000);
      // At least close to 2h.
      expect(expiresMs).toBeGreaterThan(2 * 3600 * 1000 - 5000);
    });
  });

  describe("verifySubmissionMd", () => {
    it("returns true when SUBMISSION.md is present (exact case)", async () => {
      mockDb._mockStorage.list.mockResolvedValue({
        data: [
          { name: "agent_output", metadata: { size: 1024 } },
          { name: "SUBMISSION.md", metadata: { size: 512 } },
        ],
        error: null,
      });

      const ok = await verifySubmissionMd(mockDb as never, "sub-123");
      expect(ok).toBe(true);
    });

    it("returns true for case variations (submission.md, Submission.md)", async () => {
      mockDb._mockStorage.list.mockResolvedValue({
        data: [{ name: "submission.md", metadata: { size: 100 } }],
        error: null,
      });
      expect(await verifySubmissionMd(mockDb as never, "sub-a")).toBe(true);

      mockDb._mockStorage.list.mockResolvedValue({
        data: [{ name: "Submission.md", metadata: { size: 100 } }],
        error: null,
      });
      expect(await verifySubmissionMd(mockDb as never, "sub-b")).toBe(true);
    });

    it("returns false when SUBMISSION.md is absent", async () => {
      mockDb._mockStorage.list.mockResolvedValue({
        data: [{ name: "agent_output", metadata: { size: 1024 } }],
        error: null,
      });
      expect(await verifySubmissionMd(mockDb as never, "sub-123")).toBe(false);
    });

    it("throws on storage error", async () => {
      mockDb._mockStorage.list.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });

      await expect(
        verifySubmissionMd(mockDb as never, "sub-123")
      ).rejects.toThrow("Failed to check SUBMISSION.md: boom");
    });
  });

  describe("verifyUploadExists", () => {
    it("returns true when files exist", async () => {
      mockDb._mockStorage.list.mockResolvedValue({
        data: [{ name: "agent_output", metadata: { size: 1024 } }],
        error: null,
      });

      const exists = await verifyUploadExists(mockDb as never, "sub-123");
      expect(exists).toBe(true);
      expect(mockDb._mockStorage.list).toHaveBeenCalledWith("submissions/sub-123");
    });

    it("returns false when no files exist", async () => {
      mockDb._mockStorage.list.mockResolvedValue({
        data: [],
        error: null,
      });

      const exists = await verifyUploadExists(mockDb as never, "sub-123");
      expect(exists).toBe(false);
    });

    it("ignores placeholder files", async () => {
      mockDb._mockStorage.list.mockResolvedValue({
        data: [{ name: ".emptyFolderPlaceholder", metadata: { size: 0 } }],
        error: null,
      });

      const exists = await verifyUploadExists(mockDb as never, "sub-123");
      expect(exists).toBe(false);
    });

    it("throws on storage error", async () => {
      mockDb._mockStorage.list.mockResolvedValue({
        data: null,
        error: { message: "access denied" },
      });

      await expect(
        verifyUploadExists(mockDb as never, "sub-123")
      ).rejects.toThrow("Failed to verify upload: access denied");
    });
  });

  describe("getSubmissionStoragePath", () => {
    it("returns correct path", () => {
      expect(getSubmissionStoragePath("sub-abc")).toBe("submissions/sub-abc");
    });
  });
});
