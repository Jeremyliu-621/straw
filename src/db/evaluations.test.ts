import { describe, it, expect, vi, beforeEach } from "vitest";
import { EvaluationRepository } from "./evaluations";

function mockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  const client = {
    from: vi.fn(() => chain),
  };
  return { client, chain };
}

describe("EvaluationRepository", () => {
  let repo: EvaluationRepository;
  let mock: ReturnType<typeof mockSupabase>;

  beforeEach(() => {
    mock = mockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new EvaluationRepository(mock.client as any);
  });

  describe("findBySubmission", () => {
    it("returns evaluation result when found", async () => {
      const result = { id: "e1", submission_id: "s1", final_score: 87.5 };
      mock.chain.single.mockResolvedValue({ data: result, error: null });

      const found = await repo.findBySubmission("s1");
      expect(found).toEqual(result);
    });

    it("returns null when not found", async () => {
      mock.chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const found = await repo.findBySubmission("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("create", () => {
    it("creates evaluation result", async () => {
      const input = {
        submission_id: "s1",
        test_score: 80,
        llm_score: 90,
        final_score: 84,
        llm_reasoning: "Good output",
      };
      const created = { id: "e1", ...input };
      mock.chain.single.mockResolvedValue({ data: created, error: null });

      const result = await repo.create(input);
      expect(result).toEqual(created);
      expect(mock.chain.insert).toHaveBeenCalledWith(input);
    });
  });

  describe("getDimensions", () => {
    it("returns dimensions for evaluation result", async () => {
      const dims = [
        { id: "d1", score: 85, reasoning: "Good" },
        { id: "d2", score: 92, reasoning: "Excellent" },
      ];
      mock.chain.order.mockResolvedValue({ data: dims, error: null });

      const result = await repo.getDimensions("e1");
      expect(result).toEqual(dims);
    });
  });

  describe("createDimensions", () => {
    it("creates dimensions in bulk", async () => {
      const input = [
        { evaluation_result_id: "e1", rubric_criterion_id: "rc1", score: 85 },
        { evaluation_result_id: "e1", rubric_criterion_id: "rc2", score: 92 },
      ];
      const created = input.map((d, i) => ({ id: `d${i}`, ...d }));
      mock.chain.select.mockResolvedValue({ data: created, error: null });

      const result = await repo.createDimensions(input);
      expect(result).toEqual(created);
    });

    it("returns empty array for empty input", async () => {
      const result = await repo.createDimensions([]);
      expect(result).toEqual([]);
    });
  });
});
