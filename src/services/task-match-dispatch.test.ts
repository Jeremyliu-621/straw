import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before importing the service
vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/webhook-dispatch", () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue(undefined),
}));

const mockCreateMany = vi.fn().mockResolvedValue(undefined);
vi.mock("@/db/notifications", () => ({
  NotificationRepository: class {
    createMany = mockCreateMany;
  },
}));

vi.mock("@/services/notifications.service", () => ({
  buildNotification: vi.fn((_type, userId, _rType, _rId, title, body, meta) => ({
    type: _type,
    user_id: userId,
    title,
    body,
    metadata: meta,
  })),
}));

import { dispatchTaskMatchedNotifications } from "./task-match-dispatch";
import { createServiceClient } from "@/lib/supabase";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";

describe("dispatchTaskMatchedNotifications", () => {
  const mockTask = {
    id: "task-1",
    title: "Build a REST API",
    category: "code-generation",
    deadline: "2026-04-30T00:00:00Z",
    eval_mode: "llm",
    budget_cents: 50000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches webhooks and notifications to matching agents", async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { user_id: "agent-1", categories: ["code-generation", "nlp"] },
            { user_id: "agent-2", categories: ["data-analysis"] },
            { user_id: "agent-3", categories: [] }, // matches everything
          ],
          error: null,
        }),
      }),
    };
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

    await dispatchTaskMatchedNotifications(mockTask);

    // agent-1 matches (code-generation), agent-3 matches (empty = all)
    // agent-2 does NOT match (data-analysis != code-generation)
    expect(dispatchWebhookEvent).toHaveBeenCalledTimes(2);
    expect(dispatchWebhookEvent).toHaveBeenCalledWith(
      "agent-1",
      "task.matched",
      expect.objectContaining({ event: "task.matched" })
    );
    expect(dispatchWebhookEvent).toHaveBeenCalledWith(
      "agent-3",
      "task.matched",
      expect.objectContaining({ event: "task.matched" })
    );

    // Notifications batch created for matching agents
    expect(mockCreateMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ user_id: "agent-1" }),
        expect.objectContaining({ user_id: "agent-3" }),
      ])
    );
  });

  it("does nothing when no agents exist", async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

    await dispatchTaskMatchedNotifications(mockTask);

    expect(dispatchWebhookEvent).not.toHaveBeenCalled();
  });

  it("does nothing when no agents match the category", async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { user_id: "agent-1", categories: ["data-analysis"] },
          ],
          error: null,
        }),
      }),
    };
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

    await dispatchTaskMatchedNotifications(mockTask);

    expect(dispatchWebhookEvent).not.toHaveBeenCalled();
  });

  it("handles errors without throwing", async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error("DB connection lost")),
      }),
    };
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

    // Should not throw
    await dispatchTaskMatchedNotifications(mockTask);
  });
});
