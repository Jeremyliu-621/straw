import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskRepository } from "./tasks";

function mockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  const client = {
    from: vi.fn(() => chain),
  };
  return { client, chain };
}

describe("TaskRepository", () => {
  let repo: TaskRepository;
  let mock: ReturnType<typeof mockSupabase>;

  beforeEach(() => {
    mock = mockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new TaskRepository(mock.client as any);
  });

  describe("findById", () => {
    it("returns task when found", async () => {
      const task = { id: "t1", title: "Test Task Title" };
      mock.chain.single.mockResolvedValue({ data: task, error: null });

      const result = await repo.findById("t1");
      expect(result).toEqual(task);
    });

    it("returns null when not found", async () => {
      mock.chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await repo.findById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("findByCompany", () => {
    it("returns tasks for company ordered by created_at desc", async () => {
      const tasks = [{ id: "t1" }, { id: "t2" }];
      // For list queries, order returns the data directly
      mock.chain.order.mockResolvedValue({ data: tasks, error: null });

      const result = await repo.findByCompany("c1");
      expect(result).toEqual(tasks);
      expect(mock.chain.eq).toHaveBeenCalledWith("company_id", "c1");
      expect(mock.chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });
  });

  describe("findOpen", () => {
    it("returns open tasks ordered by deadline", async () => {
      const tasks = [{ id: "t1", status: "open" }];
      mock.chain.order.mockResolvedValue({ data: tasks, error: null });

      const result = await repo.findOpen();
      expect(result).toEqual(tasks);
      expect(mock.chain.eq).toHaveBeenCalledWith("status", "open");
    });
  });

  describe("create", () => {
    it("creates and returns task", async () => {
      const input = {
        company_id: "c1",
        title: "Build a CSV Parser",
        description: "Parse CSV files",
        category: "code-generation",
        input_spec: "CSV file",
        output_spec: "JSON file",
        test_weight: 60,
        llm_weight: 40,
        budget_cents: 50000,
        deadline: "2024-12-31T00:00:00Z",
      };
      const created = { id: "t1", ...input, status: "draft" };
      mock.chain.single.mockResolvedValue({ data: created, error: null });

      const result = await repo.create(input);
      expect(result).toEqual(created);
    });
  });

  describe("updateStatus", () => {
    it("updates task status", async () => {
      const updated = { id: "t1", status: "open" };
      mock.chain.single.mockResolvedValue({ data: updated, error: null });

      const result = await repo.updateStatus("t1", "open");
      expect(result).toEqual(updated);
      expect(mock.chain.update).toHaveBeenCalledWith({ status: "open" });
    });
  });

  describe("getRubricCriteria", () => {
    it("returns criteria ordered by position", async () => {
      const criteria = [
        { id: "rc1", name: "Correctness", weight: 40, position: 0 },
        { id: "rc2", name: "Code Quality", weight: 60, position: 1 },
      ];
      mock.chain.order.mockResolvedValue({ data: criteria, error: null });

      const result = await repo.getRubricCriteria("t1");
      expect(result).toEqual(criteria);
      expect(mock.chain.eq).toHaveBeenCalledWith("task_id", "t1");
      expect(mock.chain.order).toHaveBeenCalledWith("position", { ascending: true });
    });
  });

  describe("setRubricCriteria", () => {
    it("deletes old and inserts new criteria", async () => {
      // Mock delete
      mock.chain.eq.mockResolvedValueOnce({ error: null });

      // Reset from mock for insert
      const insertChain = {
        select: vi.fn().mockResolvedValue({
          data: [
            { id: "rc1", task_id: "t1", name: "New", weight: 100, position: 0 },
          ],
          error: null,
        }),
      };
      mock.chain.insert.mockReturnValueOnce(insertChain);

      const result = await repo.setRubricCriteria("t1", [
        { name: "New", weight: 100, position: 0 },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("New");
    });

    it("returns empty array when given empty criteria", async () => {
      mock.chain.eq.mockResolvedValueOnce({ error: null });

      const result = await repo.setRubricCriteria("t1", []);
      expect(result).toEqual([]);
    });
  });
});
