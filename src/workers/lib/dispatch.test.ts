import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  dispatchWebhookFromWorker,
  dispatchNotificationFromWorker,
  dispatchNotificationToTaskOwnerFromWorker,
  writeAuditLog,
} from "./dispatch";
import { NOTIFICATION_TYPE, AUDIT_ACTION } from "@/constants";

// ── Mock Supabase ───────────────────────────────────────────

interface QueryResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

function createMockChain(resolvedValue: QueryResult) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & PromiseLike<QueryResult> = {
    select: vi.fn().mockImplementation(() => chain),
    insert: vi.fn().mockImplementation(() => chain),
    update: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation(() => chain),
    in: vi.fn().mockImplementation(() => chain),
    is: vi.fn().mockImplementation(() => chain),
    single: vi.fn().mockImplementation(() => chain),
    order: vi.fn().mockImplementation(() => chain),
    then: vi.fn().mockImplementation(
      (resolve: (v: QueryResult) => void) => Promise.resolve(resolvedValue).then(resolve)
    ),
  } as never;
  return chain;
}

function createMockDb() {
  const queryQueue: Array<{ table: string; chain: ReturnType<typeof createMockChain> }> = [];

  function pushQuery(table: string, result: QueryResult) {
    queryQueue.push({ table, chain: createMockChain(result) });
  }

  const from = vi.fn().mockImplementation((table: string) => {
    const idx = queryQueue.findIndex((q) => q.table === table);
    if (idx === -1) {
      return createMockChain({ data: [], error: null });
    }
    const [entry] = queryQueue.splice(idx, 1);
    return entry.chain;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = { from } as any;
  return { db, from, pushQuery };
}

function createMockQueue() {
  return {
    add: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// ── Tests ────────────────────────────────────────────────────

describe("dispatchWebhookFromWorker", () => {
  let db: ReturnType<typeof createMockDb>["db"];
  let pushQuery: ReturnType<typeof createMockDb>["pushQuery"];
  let queue: ReturnType<typeof createMockQueue>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockDb();
    db = mock.db;
    pushQuery = mock.pushQuery;
    queue = createMockQueue();
  });

  it("dispatches webhook to matching subscriptions", async () => {
    pushQuery("webhooks", {
      data: [
        { id: "wh-1", url: "https://example.com/hook", secret: "secret", events: ["submission.completed"] },
      ],
      error: null,
    });
    pushQuery("webhook_deliveries", {
      data: { id: "delivery-1" },
      error: null,
    });

    await dispatchWebhookFromWorker(db, queue, "company-1", "submission.completed", {
      event: "submission.completed",
      timestamp: new Date().toISOString(),
      data: { submission_id: "sub-1" },
    });

    expect(queue.add).toHaveBeenCalledOnce();
  });

  it("skips when no matching webhooks", async () => {
    pushQuery("webhooks", {
      data: [
        { id: "wh-1", url: "https://example.com/hook", secret: "secret", events: ["deal.created"] },
      ],
      error: null,
    });

    await dispatchWebhookFromWorker(db, queue, "company-1", "submission.completed", {
      event: "submission.completed",
      timestamp: new Date().toISOString(),
      data: {},
    });

    expect(queue.add).not.toHaveBeenCalled();
  });

  it("handles errors without throwing", async () => {
    pushQuery("webhooks", { data: null, error: { message: "DB error" } });

    // Should not throw
    await dispatchWebhookFromWorker(db, queue, "company-1", "submission.completed", {
      event: "submission.completed",
      timestamp: new Date().toISOString(),
      data: {},
    });
  });
});

describe("dispatchNotificationFromWorker", () => {
  let db: ReturnType<typeof createMockDb>["db"];
  let pushQuery: ReturnType<typeof createMockDb>["pushQuery"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockDb();
    db = mock.db;
    pushQuery = mock.pushQuery;
  });

  it("creates notification when preferences allow", async () => {
    // getPreferences returns empty (default: enabled)
    pushQuery("notification_preferences", { data: [], error: null });
    // create notification
    pushQuery("notifications", { data: { id: "notif-1" }, error: null });

    await dispatchNotificationFromWorker(
      db,
      NOTIFICATION_TYPE.SUBMISSION_COMPLETED,
      "user-1",
      "Test Title",
      "Test body"
    );

    expect(db.from).toHaveBeenCalledWith("notification_preferences");
    expect(db.from).toHaveBeenCalledWith("notifications");
  });

  it("skips when user has disabled notification type", async () => {
    pushQuery("notification_preferences", {
      data: [
        { notification_type: NOTIFICATION_TYPE.SUBMISSION_COMPLETED, in_app_enabled: false },
      ],
      error: null,
    });

    await dispatchNotificationFromWorker(
      db,
      NOTIFICATION_TYPE.SUBMISSION_COMPLETED,
      "user-1",
      "Test Title",
      "Test body"
    );

    // Should not create a notification
    const createCalls = (db.from as ReturnType<typeof vi.fn>).mock.calls.filter(
      (args: string[]) => args[0] === "notifications"
    );
    expect(createCalls).toHaveLength(0);
  });

  it("handles errors without throwing", async () => {
    pushQuery("notification_preferences", { data: null, error: { message: "DB error" } });

    // Should not throw
    await dispatchNotificationFromWorker(
      db,
      NOTIFICATION_TYPE.SUBMISSION_COMPLETED,
      "user-1",
      "Title",
      "Body"
    );
  });
});

describe("dispatchNotificationToTaskOwnerFromWorker", () => {
  let db: ReturnType<typeof createMockDb>["db"];
  let pushQuery: ReturnType<typeof createMockDb>["pushQuery"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockDb();
    db = mock.db;
    pushQuery = mock.pushQuery;
  });

  it("looks up task owner and dispatches notification", async () => {
    // Look up task
    pushQuery("tasks", { data: { company_id: "company-1" }, error: null });
    // getPreferences
    pushQuery("notification_preferences", { data: [], error: null });
    // create notification
    pushQuery("notifications", { data: { id: "notif-1" }, error: null });

    await dispatchNotificationToTaskOwnerFromWorker(
      db,
      "task-1",
      NOTIFICATION_TYPE.TASK_CLOSED,
      "Task closed",
      "Your task has been closed"
    );

    expect(db.from).toHaveBeenCalledWith("tasks");
    expect(db.from).toHaveBeenCalledWith("notifications");
  });

  it("handles task not found without throwing", async () => {
    pushQuery("tasks", { data: null, error: { message: "Not found" } });

    await dispatchNotificationToTaskOwnerFromWorker(
      db,
      "task-1",
      NOTIFICATION_TYPE.TASK_CLOSED,
      "Task closed",
      "Your task has been closed"
    );
  });
});

describe("writeAuditLog", () => {
  let db: ReturnType<typeof createMockDb>["db"];
  let pushQuery: ReturnType<typeof createMockDb>["pushQuery"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockDb();
    db = mock.db;
    pushQuery = mock.pushQuery;
  });

  it("writes audit log entry", async () => {
    pushQuery("audit_log", {
      data: { id: "log-1" },
      error: null,
    });

    await writeAuditLog(
      db,
      AUDIT_ACTION.TASK_CLOSED,
      "user-1",
      "task",
      "task-1",
      { reason: "test" }
    );

    expect(db.from).toHaveBeenCalledWith("audit_log");
  });

  it("handles errors without throwing", async () => {
    pushQuery("audit_log", { data: null, error: { message: "Write failed" } });

    // Should not throw
    await writeAuditLog(
      db,
      AUDIT_ACTION.TASK_CLOSED,
      "user-1",
      "task",
      "task-1"
    );
  });
});
