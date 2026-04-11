import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkDeadlines } from "./task-deadline.service";
import { TASK_STATUS, SUBMISSION_STATUS } from "@/constants";

// ── Mock Supabase builder ────────────────────────────────────
// Each call to db.from(table) returns a fresh chain.
// We track calls and let each test configure return values
// by registering "query scenarios" keyed by table name.

interface QueryResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

type ChainTerminator = () => QueryResult;

/**
 * Creates a chainable mock that records method calls and resolves
 * to the configured return value when awaited.
 */
function createMockChain(resolvedValue: QueryResult) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & PromiseLike<QueryResult> = {
    select: vi.fn().mockImplementation(() => chain),
    insert: vi.fn().mockImplementation(() => chain),
    update: vi.fn().mockImplementation(() => chain),
    delete: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation(() => chain),
    in: vi.fn().mockImplementation(() => chain),
    lt: vi.fn().mockImplementation(() => chain),
    is: vi.fn().mockImplementation(() => chain),
    single: vi.fn().mockImplementation(() => chain),
    order: vi.fn().mockImplementation(() => chain),
    // Make the chain thenable so `await db.from(...).select(...)...` resolves
    then: vi.fn().mockImplementation(
      (resolve: (v: QueryResult) => void) => Promise.resolve(resolvedValue).then(resolve)
    ),
  } as never;
  return chain;
}

/**
 * Build a mock SupabaseClient whose `from()` returns preconfigured
 * chains in sequence. Call `pushQuery(table, result)` to queue a
 * return value for the next call to `db.from(table)`.
 */
function createMockDb() {
  const queryQueue: Array<{ table: string; chain: ReturnType<typeof createMockChain> }> = [];

  function pushQuery(table: string, result: QueryResult) {
    queryQueue.push({ table, chain: createMockChain(result) });
  }

  const from = vi.fn().mockImplementation((table: string) => {
    const idx = queryQueue.findIndex((q) => q.table === table);
    if (idx === -1) {
      // No queued result — return empty success
      return createMockChain({ data: [], error: null });
    }
    const [entry] = queryQueue.splice(idx, 1);
    return entry.chain;
  });

  const db = { from } as unknown;
  return { db: db as Parameters<typeof checkDeadlines>[0], from, pushQuery };
}

// ── Tests ────────────────────────────────────────────────────

describe("checkDeadlines", () => {
  let db: ReturnType<typeof createMockDb>["db"];
  let from: ReturnType<typeof createMockDb>["from"];
  let pushQuery: ReturnType<typeof createMockDb>["pushQuery"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockDb();
    db = mock.db;
    from = mock.from;
    pushQuery = mock.pushQuery;
  });

  // ── 1. No expired tasks ──────────────────────────────────
  it("returns empty result when no expired tasks exist", async () => {
    // Query for open tasks past deadline returns empty
    pushQuery("tasks", { data: [], error: null });
    // Query for evaluating tasks returns empty
    pushQuery("tasks", { data: [], error: null });

    const result = await checkDeadlines(db);

    expect(result.tasksTransitionedToEvaluating).toEqual([]);
    expect(result.tasksTransitionedToClosed).toEqual([]);
    expect(result.evaluationsEnqueued).toBe(0);
    expect(result.errors).toEqual([]);
  });

  // ── 2. Transitions open tasks past deadline to evaluating ──
  it("transitions open tasks past deadline to evaluating", async () => {
    const pastDeadline = new Date(Date.now() - 86_400_000).toISOString();
    const taskId = "task-expired-1";

    // Step 1: fetch expired tasks
    pushQuery("tasks", {
      data: [{ id: taskId, title: "Expired Task", deadline: pastDeadline }],
      error: null,
    });
    // Step 2: update task status -> evaluating
    pushQuery("tasks", { data: null, error: null });
    // Step 3 & 4: evaluating tasks query (for close check)
    pushQuery("tasks", { data: [], error: null });

    const result = await checkDeadlines(db);

    expect(result.tasksTransitionedToEvaluating).toEqual([taskId]);
    expect(result.errors).toEqual([]);
    // Verify the update call targeted the right table
    expect(from).toHaveBeenCalledWith("tasks");
  });

  // ── 3. Does not transition tasks not past deadline ────────
  // (The service uses lt("deadline", now) so the DB filters these out.
  //  If the DB returns nothing, no transitions happen.)
  it("does not transition tasks that are not past deadline", async () => {
    // DB correctly returns no expired tasks
    pushQuery("tasks", { data: [], error: null });
    // Evaluating tasks also empty
    pushQuery("tasks", { data: [], error: null });

    const result = await checkDeadlines(db);

    expect(result.tasksTransitionedToEvaluating).toEqual([]);
  });

  // ── 4. Enqueues evaluation for completed submissions without eval results ──
  it("enqueues evaluation for completed submissions without eval results", async () => {
    const taskId = "task-eval-1";
    const subId = "sub-1";
    const outputUrl = "https://storage.example.com/output.tar.gz";

    // Step 1: expired tasks
    pushQuery("tasks", {
      data: [{ id: taskId, title: "Task", deadline: "2020-01-01T00:00:00Z", company_id: "company-1" }],
      error: null,
    });
    // Step 2: update to evaluating
    pushQuery("tasks", { data: null, error: null });
    // Step 3: completed submissions
    pushQuery("submissions", {
      data: [{ id: subId, output_url: outputUrl }],
      error: null,
    });
    // Step 4: check existing evaluation_results for sub
    pushQuery("evaluation_results", { data: null, error: null });
    // Step 5: evaluating tasks (for close check)
    pushQuery("tasks", { data: [], error: null });

    const enqueueEvaluation = vi.fn().mockResolvedValue(undefined);

    const result = await checkDeadlines(db, enqueueEvaluation);

    expect(enqueueEvaluation).toHaveBeenCalledWith(subId, taskId, outputUrl);
    expect(result.evaluationsEnqueued).toBe(1);
    expect(result.errors).toEqual([]);
  });

  // ── 5. Does not enqueue evaluation if result already exists ──
  it("does not enqueue evaluation if evaluation result already exists", async () => {
    const taskId = "task-eval-2";
    const subId = "sub-2";
    const outputUrl = "https://storage.example.com/output2.tar.gz";

    // expired tasks
    pushQuery("tasks", {
      data: [{ id: taskId, title: "Task", deadline: "2020-01-01T00:00:00Z", company_id: "company-1" }],
      error: null,
    });
    // update to evaluating
    pushQuery("tasks", { data: null, error: null });
    // completed submissions
    pushQuery("submissions", {
      data: [{ id: subId, output_url: outputUrl }],
      error: null,
    });
    // evaluation result already exists
    pushQuery("evaluation_results", { data: { id: "eval-1" }, error: null });
    // evaluating tasks for close check
    pushQuery("tasks", { data: [], error: null });

    const enqueueEvaluation = vi.fn().mockResolvedValue(undefined);

    const result = await checkDeadlines(db, enqueueEvaluation);

    expect(enqueueEvaluation).not.toHaveBeenCalled();
    expect(result.evaluationsEnqueued).toBe(0);
  });

  // ── 6. Transitions evaluating tasks with all evaluated submissions to closed ──
  it("transitions evaluating tasks with all submissions evaluated to closed", async () => {
    const taskId = "task-close-1";
    const sub1 = "sub-c1";
    const sub2 = "sub-c2";

    // No expired open tasks
    pushQuery("tasks", { data: [], error: null });
    // Evaluating tasks
    pushQuery("tasks", { data: [{ id: taskId }], error: null });
    // All submissions for task
    pushQuery("submissions", {
      data: [
        { id: sub1, status: SUBMISSION_STATUS.COMPLETED },
        { id: sub2, status: SUBMISSION_STATUS.COMPLETED },
      ],
      error: null,
    });
    // Evaluation results count matches number of completed submissions
    pushQuery("evaluation_results", { data: null, error: null, count: 2 });
    // Update task to closed
    pushQuery("tasks", { data: null, error: null });

    const result = await checkDeadlines(db);

    expect(result.tasksTransitionedToClosed).toEqual([taskId]);
  });

  // ── 7. Transitions evaluating tasks with no submissions to closed ──
  it("transitions evaluating tasks with no submissions to closed", async () => {
    const taskId = "task-no-subs";

    // No expired open tasks
    pushQuery("tasks", { data: [], error: null });
    // Evaluating tasks
    pushQuery("tasks", { data: [{ id: taskId }], error: null });
    // No submissions
    pushQuery("submissions", { data: [], error: null });
    // Update to closed
    pushQuery("tasks", { data: null, error: null });

    const result = await checkDeadlines(db);

    expect(result.tasksTransitionedToClosed).toEqual([taskId]);
  });

  // ── 8. Transitions evaluating tasks where all submissions failed to closed ──
  it("transitions evaluating tasks where all submissions failed to closed", async () => {
    const taskId = "task-all-failed";

    // No expired open tasks
    pushQuery("tasks", { data: [], error: null });
    // Evaluating tasks
    pushQuery("tasks", { data: [{ id: taskId }], error: null });
    // All submissions failed
    pushQuery("submissions", {
      data: [
        { id: "sub-f1", status: SUBMISSION_STATUS.FAILED },
        { id: "sub-f2", status: SUBMISSION_STATUS.FAILED },
      ],
      error: null,
    });
    // Update to closed
    pushQuery("tasks", { data: null, error: null });

    const result = await checkDeadlines(db);

    expect(result.tasksTransitionedToClosed).toEqual([taskId]);
  });

  // ── 9. Does not close evaluating tasks with submissions still running ──
  it("does not close evaluating tasks with submissions still running", async () => {
    const taskId = "task-still-running";

    // No expired open tasks
    pushQuery("tasks", { data: [], error: null });
    // Evaluating tasks
    pushQuery("tasks", { data: [{ id: taskId }], error: null });
    // Mix of completed and running submissions
    pushQuery("submissions", {
      data: [
        { id: "sub-1", status: SUBMISSION_STATUS.COMPLETED },
        { id: "sub-2", status: SUBMISSION_STATUS.RUNNING },
      ],
      error: null,
    });

    const result = await checkDeadlines(db);

    expect(result.tasksTransitionedToClosed).toEqual([]);
  });

  // ── 10. Handles fetch error gracefully ────────────────────
  it("handles fetch error gracefully and adds to errors array", async () => {
    pushQuery("tasks", { data: null, error: { message: "connection refused" } });

    const result = await checkDeadlines(db);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("connection refused");
    // Should return early — no transitions
    expect(result.tasksTransitionedToEvaluating).toEqual([]);
    expect(result.tasksTransitionedToClosed).toEqual([]);
  });

  // ── 11. Handles task update error gracefully ──────────────
  it("handles task update error gracefully and continues", async () => {
    const taskId1 = "task-err-1";
    const taskId2 = "task-err-2";

    // Two expired tasks
    pushQuery("tasks", {
      data: [
        { id: taskId1, title: "T1", deadline: "2020-01-01T00:00:00Z" },
        { id: taskId2, title: "T2", deadline: "2020-01-01T00:00:00Z" },
      ],
      error: null,
    });
    // First update fails
    pushQuery("tasks", { data: null, error: { message: "constraint violation" } });
    // Second update succeeds
    pushQuery("tasks", { data: null, error: null });
    // Evaluating tasks check
    pushQuery("tasks", { data: [], error: null });

    const result = await checkDeadlines(db);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(taskId1);
    expect(result.errors[0]).toContain("constraint violation");
    // Second task should still transition
    expect(result.tasksTransitionedToEvaluating).toEqual([taskId2]);
  });

  // ── 12. Handles enqueueEvaluation failure gracefully ──────
  it("handles enqueueEvaluation failure gracefully", async () => {
    const taskId = "task-enqueue-err";
    const subId = "sub-enqueue-err";

    pushQuery("tasks", {
      data: [{ id: taskId, title: "Task", deadline: "2020-01-01T00:00:00Z", company_id: "company-1" }],
      error: null,
    });
    pushQuery("tasks", { data: null, error: null });
    pushQuery("submissions", {
      data: [{ id: subId, output_url: "https://example.com/out" }],
      error: null,
    });
    pushQuery("evaluation_results", { data: null, error: null });
    pushQuery("tasks", { data: [], error: null });

    const enqueueEvaluation = vi.fn().mockRejectedValue(new Error("queue full"));

    const result = await checkDeadlines(db, enqueueEvaluation);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(subId);
    expect(result.evaluationsEnqueued).toBe(0);
  });

  // ── 13. Skips enqueueing when no enqueueEvaluation is provided ──
  it("skips enqueueing when enqueueEvaluation callback is not provided", async () => {
    pushQuery("tasks", {
      data: [{ id: "task-1", title: "Task", deadline: "2020-01-01T00:00:00Z" }],
      error: null,
    });
    pushQuery("tasks", { data: null, error: null });
    // evaluating tasks
    pushQuery("tasks", { data: [], error: null });

    // No enqueueEvaluation callback — should not query submissions at all
    const result = await checkDeadlines(db);

    expect(result.tasksTransitionedToEvaluating).toEqual(["task-1"]);
    expect(result.evaluationsEnqueued).toBe(0);
    // Should not have queried submissions table
    const submissionsCalls = from.mock.calls.filter(
      (c: string[]) => c[0] === "submissions"
    );
    expect(submissionsCalls).toHaveLength(0);
  });

  // ── 14. Does not enqueue when submission has no output_url ──
  it("does not enqueue evaluation when submission has no output_url", async () => {
    const taskId = "task-no-url";
    const subId = "sub-no-url";

    pushQuery("tasks", {
      data: [{ id: taskId, title: "Task", deadline: "2020-01-01T00:00:00Z", company_id: "company-1" }],
      error: null,
    });
    pushQuery("tasks", { data: null, error: null });
    pushQuery("submissions", {
      data: [{ id: subId, output_url: null }],
      error: null,
    });
    pushQuery("evaluation_results", { data: null, error: null });
    pushQuery("tasks", { data: [], error: null });

    const enqueueEvaluation = vi.fn().mockResolvedValue(undefined);

    const result = await checkDeadlines(db, enqueueEvaluation);

    expect(enqueueEvaluation).not.toHaveBeenCalled();
    expect(result.evaluationsEnqueued).toBe(0);
  });

  // ── 15. Multiple tasks and submissions in one run ─────────
  it("handles multiple expired tasks with multiple submissions", async () => {
    const task1 = "task-multi-1";
    const task2 = "task-multi-2";

    // Two expired tasks
    pushQuery("tasks", {
      data: [
        { id: task1, title: "T1", deadline: "2020-01-01T00:00:00Z" },
        { id: task2, title: "T2", deadline: "2020-06-01T00:00:00Z" },
      ],
      error: null,
    });
    // Update task1 to evaluating
    pushQuery("tasks", { data: null, error: null });
    // Update task2 to evaluating
    pushQuery("tasks", { data: null, error: null });
    // Evaluating tasks for close check
    pushQuery("tasks", { data: [], error: null });

    const result = await checkDeadlines(db);

    expect(result.tasksTransitionedToEvaluating).toEqual([task1, task2]);
    expect(result.errors).toEqual([]);
  });
});
