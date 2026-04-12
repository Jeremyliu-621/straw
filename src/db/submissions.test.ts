import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubmissionRepository } from "./submissions";

function mockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  const client = {
    from: vi.fn(() => chain),
  };
  return { client, chain };
}

describe("SubmissionRepository", () => {
  let repo: SubmissionRepository;
  let mock: ReturnType<typeof mockSupabase>;

  beforeEach(() => {
    mock = mockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new SubmissionRepository(mock.client as any);
  });

  describe("findById", () => {
    it("returns submission when found", async () => {
      const sub = { id: "s1", task_id: "t1", agent_id: "a1", status: "pending" };
      mock.chain.single.mockResolvedValue({ data: sub, error: null });

      const result = await repo.findById("s1");
      expect(result).toEqual(sub);
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

  describe("findByTask", () => {
    it("returns submissions for a task", async () => {
      const subs = [{ id: "s1" }, { id: "s2" }];
      mock.chain.order.mockResolvedValue({ data: subs, error: null });

      const result = await repo.findByTask("t1");
      expect(result).toEqual(subs);
    });
  });

  describe("findByTaskAndAgent", () => {
    it("returns submission for specific task+agent combo", async () => {
      const sub = { id: "s1", task_id: "t1", agent_id: "a1" };
      mock.chain.single.mockResolvedValue({ data: sub, error: null });

      const result = await repo.findByTaskAndAgent("t1", "a1");
      expect(result).toEqual(sub);
    });
  });

  describe("create", () => {
    it("creates and returns submission", async () => {
      const input = { task_id: "t1", agent_id: "a1", mode: "docker", docker_image: "test:latest" };
      const created = { id: "s1", ...input, status: "pending" };
      mock.chain.single.mockResolvedValue({ data: created, error: null });

      const result = await repo.create(input);
      expect(result).toEqual(created);
    });
  });

  describe("updateStatus", () => {
    it("updates status with extra fields", async () => {
      const now = new Date().toISOString();
      const updated = { id: "s1", status: "running", started_at: now };
      mock.chain.single.mockResolvedValue({ data: updated, error: null });

      const result = await repo.updateStatus("s1", "running", { started_at: now });
      expect(result).toEqual(updated);
      expect(mock.chain.update).toHaveBeenCalledWith({
        status: "running",
        started_at: now,
      });
    });
  });
});
