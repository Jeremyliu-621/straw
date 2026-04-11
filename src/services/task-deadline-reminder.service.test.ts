import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  findAndMarkTasksForReminder,
  getActiveAgentsForTask,
} from "./task-deadline-reminder.service";
import { TASK_STATUS } from "@/constants";

// ── Mock Supabase builder ────────────────────────────────────

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
    lt: vi.fn().mockImplementation(() => chain),
    gt: vi.fn().mockImplementation(() => chain),
    is: vi.fn().mockImplementation(() => chain),
    single: vi.fn().mockImplementation(() => chain),
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

  const db = { from } as unknown;
  return { db: db as Parameters<typeof findAndMarkTasksForReminder>[0], from, pushQuery };
}

// ── Tests ────────────────────────────────────────────────────

describe("findAndMarkTasksForReminder", () => {
  let db: ReturnType<typeof createMockDb>["db"];
  let pushQuery: ReturnType<typeof createMockDb>["pushQuery"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockDb();
    db = mock.db;
    pushQuery = mock.pushQuery;
  });

  it("finds tasks approaching deadline and marks them as reminded", async () => {
    const futureDeadline = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // 12h from now

    pushQuery("tasks", {
      data: [
        { id: "task-1", title: "Urgent Task", company_id: "company-1", deadline: futureDeadline },
      ],
      error: null,
    });
    // Mark as reminded
    pushQuery("tasks", { data: null, error: null });

    const result = await findAndMarkTasksForReminder(db, 24);

    expect(result.reminders).toHaveLength(1);
    expect(result.reminders[0].id).toBe("task-1");
    expect(result.reminders[0].title).toBe("Urgent Task");
    expect(result.reminders[0].company_id).toBe("company-1");
    expect(result.reminders[0].hoursRemaining).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
  });

  it("returns empty when no tasks approaching deadline", async () => {
    pushQuery("tasks", { data: [], error: null });

    const result = await findAndMarkTasksForReminder(db, 24);

    expect(result.reminders).toHaveLength(0);
    expect(result.errors).toEqual([]);
  });

  it("handles fetch error gracefully", async () => {
    pushQuery("tasks", { data: null, error: { message: "DB connection failed" } });

    const result = await findAndMarkTasksForReminder(db, 24);

    expect(result.reminders).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("DB connection failed");
  });

  it("handles mark-as-reminded update failure gracefully", async () => {
    const futureDeadline = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    pushQuery("tasks", {
      data: [
        { id: "task-1", title: "Urgent Task", company_id: "company-1", deadline: futureDeadline },
      ],
      error: null,
    });
    // Mark as reminded fails
    pushQuery("tasks", { data: null, error: { message: "Update failed" } });

    const result = await findAndMarkTasksForReminder(db, 24);

    expect(result.reminders).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Update failed");
  });

  it("handles multiple tasks approaching deadline", async () => {
    const futureDeadline1 = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const futureDeadline2 = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();

    pushQuery("tasks", {
      data: [
        { id: "task-1", title: "Task 1", company_id: "company-1", deadline: futureDeadline1 },
        { id: "task-2", title: "Task 2", company_id: "company-2", deadline: futureDeadline2 },
      ],
      error: null,
    });
    // Mark task 1 as reminded
    pushQuery("tasks", { data: null, error: null });
    // Mark task 2 as reminded
    pushQuery("tasks", { data: null, error: null });

    const result = await findAndMarkTasksForReminder(db, 24);

    expect(result.reminders).toHaveLength(2);
    expect(result.reminders[0].hoursRemaining).toBeLessThan(result.reminders[1].hoursRemaining);
  });
});

describe("getActiveAgentsForTask", () => {
  let db: ReturnType<typeof createMockDb>["db"];
  let pushQuery: ReturnType<typeof createMockDb>["pushQuery"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockDb();
    db = mock.db;
    pushQuery = mock.pushQuery;
  });

  it("returns deduplicated agent IDs", async () => {
    pushQuery("submissions", {
      data: [
        { agent_id: "agent-1" },
        { agent_id: "agent-2" },
        { agent_id: "agent-1" }, // Duplicate
      ],
      error: null,
    });

    const agents = await getActiveAgentsForTask(db, "task-1");

    expect(agents).toHaveLength(2);
    expect(agents).toContain("agent-1");
    expect(agents).toContain("agent-2");
  });

  it("returns empty array when no submissions", async () => {
    pushQuery("submissions", { data: [], error: null });

    const agents = await getActiveAgentsForTask(db, "task-1");

    expect(agents).toHaveLength(0);
  });

  it("returns empty array on error", async () => {
    pushQuery("submissions", { data: null, error: { message: "DB error" } });

    const agents = await getActiveAgentsForTask(db, "task-1");

    expect(agents).toHaveLength(0);
  });
});
