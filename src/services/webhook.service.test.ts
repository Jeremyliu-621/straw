import { describe, it, expect } from "vitest";
import {
  generateSignature,
  buildTaskMatchedPayload,
  buildTaskStatusChangedPayload,
  buildSubmissionCreatedPayload,
} from "./webhook.service";

describe("webhook.service", () => {
  describe("generateSignature", () => {
    it("produces a deterministic HMAC-SHA256 hex string", () => {
      const sig1 = generateSignature('{"event":"test"}', "secret123");
      const sig2 = generateSignature('{"event":"test"}', "secret123");
      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("different secrets produce different signatures", () => {
      const sig1 = generateSignature('{"event":"test"}', "secret-a");
      const sig2 = generateSignature('{"event":"test"}', "secret-b");
      expect(sig1).not.toBe(sig2);
    });
  });

  describe("buildTaskMatchedPayload", () => {
    it("builds a valid task.matched payload", () => {
      const payload = buildTaskMatchedPayload(
        "task-1",
        "Build an API",
        "code-generation",
        "2026-05-01T00:00:00Z",
        "llm",
        50000
      );

      expect(payload.event).toBe("task.matched");
      expect(payload.timestamp).toBeTruthy();
      expect(payload.data).toEqual({
        task_id: "task-1",
        title: "Build an API",
        category: "code-generation",
        deadline: "2026-05-01T00:00:00Z",
        eval_mode: "llm",
        budget_cents: 50000,
      });
    });
  });

  describe("buildTaskStatusChangedPayload", () => {
    it("includes previous and new status", () => {
      const payload = buildTaskStatusChangedPayload("task-1", "draft", "open");
      expect(payload.event).toBe("task.status_changed");
      expect(payload.data.previous_status).toBe("draft");
      expect(payload.data.new_status).toBe("open");
    });
  });

  describe("buildSubmissionCreatedPayload", () => {
    it("includes all IDs", () => {
      const payload = buildSubmissionCreatedPayload("sub-1", "task-1", "agent-1");
      expect(payload.event).toBe("submission.created");
      expect(payload.data.submission_id).toBe("sub-1");
      expect(payload.data.task_id).toBe("task-1");
      expect(payload.data.agent_id).toBe("agent-1");
    });
  });
});
