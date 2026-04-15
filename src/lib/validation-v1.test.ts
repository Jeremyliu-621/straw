import { describe, it, expect } from "vitest";
import {
  createTaskSchema,
  updateTaskSchema,
  createDealSchema,
  rubricCriterionSchema,
} from "@/lib/validation";

/**
 * Comprehensive validation schema tests for v1 API payloads.
 *
 * These complement the existing validation.test.ts by testing
 * createTaskSchema (with its cross-field refinements) and createDealSchema.
 */

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const FUTURE_DEADLINE = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

function validTaskPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "Test Task Title",
    description: "A detailed description",
    category: "code-generation",
    input_spec: "Input spec",
    output_spec: "Output spec",
    test_weight: 50,
    llm_weight: 50,
    budget_cents: 50000,
    deadline: FUTURE_DEADLINE,
    criteria: [
      { name: "Correctness", weight: 60, position: 0 },
      { name: "Quality", weight: 40, position: 1 },
    ],
    eval_mode: "llm",
    ...overrides,
  };
}

// ── createTaskSchema ─────────────────────────────────────────

describe("createTaskSchema", () => {
  describe("valid payloads", () => {
    it("accepts a complete valid payload", () => {
      const result = createTaskSchema.safeParse(validTaskPayload());
      expect(result.success).toBe(true);
    });

    it("accepts payload with all optional fields", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({
          eval_mode: "container",
          eval_image: "registry.io/eval:v1",
          eval_network: true,
          eval_memory_mb: 2048,
          eval_timeout_seconds: 1800,
        })
      );
      expect(result.success).toBe(true);
    });

    it("accepts minimum viable payload (defaults applied)", () => {
      const result = createTaskSchema.safeParse({
        title: "X",
        test_weight: 0,
        llm_weight: 100,
        budget_cents: 10000,
        deadline: FUTURE_DEADLINE,
        criteria: [{ name: "Overall", weight: 100, position: 0 }],
      });
      expect(result.success).toBe(true);
    });

    it("accepts description at max length", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ description: "x".repeat(10000) })
      );
      expect(result.success).toBe(true);
    });

    it("accepts title at max length (200 chars)", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ title: "A".repeat(200) })
      );
      expect(result.success).toBe(true);
    });

    it("accepts budget at max ($1,000,000)", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ budget_cents: 100_000_000 })
      );
      expect(result.success).toBe(true);
    });

    it("accepts 20 criteria (maximum)", () => {
      const criteria = Array.from({ length: 20 }, (_, i) => ({
        name: `C${i}`,
        weight: 5,
        position: i,
      }));
      const result = createTaskSchema.safeParse(
        validTaskPayload({ criteria })
      );
      expect(result.success).toBe(true);
    });

    it("accepts hybrid eval_mode with image", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({
          eval_mode: "hybrid",
          eval_image: "org/hybrid-eval:v2",
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe("title validation", () => {
    it("rejects empty title", () => {
      const result = createTaskSchema.safeParse(validTaskPayload({ title: "" }));
      expect(result.success).toBe(false);
    });

    it("rejects title over 200 chars", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ title: "A".repeat(201) })
      );
      expect(result.success).toBe(false);
    });
  });

  describe("description validation", () => {
    it("rejects description over 10000 chars", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ description: "x".repeat(10001) })
      );
      expect(result.success).toBe(false);
    });
  });

  describe("budget validation", () => {
    it("rejects budget below $100 (10000 cents)", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ budget_cents: 9999 })
      );
      expect(result.success).toBe(false);
    });

    it("rejects budget above $1,000,000", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ budget_cents: 100_000_001 })
      );
      expect(result.success).toBe(false);
    });

    it("rejects non-integer budget", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ budget_cents: 50000.5 })
      );
      expect(result.success).toBe(false);
    });
  });

  describe("deadline validation", () => {
    it("rejects deadline less than 24 hours from now", () => {
      const tooSoon = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
      const result = createTaskSchema.safeParse(
        validTaskPayload({ deadline: tooSoon })
      );
      expect(result.success).toBe(false);
    });

    it("rejects past deadline", () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const result = createTaskSchema.safeParse(
        validTaskPayload({ deadline: past })
      );
      expect(result.success).toBe(false);
    });

    it("rejects invalid date string", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ deadline: "not-a-date" })
      );
      expect(result.success).toBe(false);
    });
  });

  describe("weight validation (cross-field)", () => {
    it("rejects test_weight + llm_weight != 100", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ test_weight: 30, llm_weight: 30 })
      );
      expect(result.success).toBe(false);
    });

    it("accepts test_weight=100, llm_weight=0", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ test_weight: 100, llm_weight: 0 })
      );
      expect(result.success).toBe(true);
    });

    it("accepts test_weight=0, llm_weight=100", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ test_weight: 0, llm_weight: 100 })
      );
      expect(result.success).toBe(true);
    });
  });

  describe("criteria validation (cross-field)", () => {
    it("rejects criteria weights not summing to 100", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({
          criteria: [
            { name: "A", weight: 30, position: 0 },
            { name: "B", weight: 30, position: 1 },
          ],
        })
      );
      expect(result.success).toBe(false);
    });

    it("rejects empty criteria array", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ criteria: [] })
      );
      expect(result.success).toBe(false);
    });

    it("rejects more than 20 criteria", () => {
      const criteria = Array.from({ length: 21 }, (_, i) => ({
        name: `C${i}`,
        weight: i < 20 ? 5 : 0,
        position: i,
      }));
      const result = createTaskSchema.safeParse(
        validTaskPayload({ criteria })
      );
      expect(result.success).toBe(false);
    });
  });

  describe("eval mode validation (cross-field)", () => {
    it("rejects container mode without eval_image", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({
          eval_mode: "container",
          eval_image: null,
        })
      );
      expect(result.success).toBe(false);
    });

    it("rejects hybrid mode without eval_image", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({
          eval_mode: "hybrid",
        })
      );
      expect(result.success).toBe(false);
    });

    it("accepts llm mode without eval_image", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ eval_mode: "llm" })
      );
      expect(result.success).toBe(true);
    });

    it("rejects invalid eval_mode", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ eval_mode: "manual" })
      );
      expect(result.success).toBe(false);
    });
  });

  describe("eval constraints", () => {
    it("rejects eval_memory_mb below 512", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ eval_memory_mb: 256 })
      );
      expect(result.success).toBe(false);
    });

    it("rejects eval_memory_mb above 4096", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ eval_memory_mb: 8192 })
      );
      expect(result.success).toBe(false);
    });

    it("rejects eval_timeout_seconds below 600 (10 min)", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ eval_timeout_seconds: 300 })
      );
      expect(result.success).toBe(false);
    });

    it("rejects eval_timeout_seconds above 3600 (1 hour)", () => {
      const result = createTaskSchema.safeParse(
        validTaskPayload({ eval_timeout_seconds: 7200 })
      );
      expect(result.success).toBe(false);
    });
  });
});

// ── rubricCriterionSchema ────────────────────────────────────

describe("rubricCriterionSchema", () => {
  it("accepts valid criterion", () => {
    const result = rubricCriterionSchema.safeParse({
      name: "Correctness",
      description: "Must pass all tests",
      weight: 50,
      position: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts criterion without description", () => {
    const result = rubricCriterionSchema.safeParse({
      name: "Quality",
      weight: 30,
      position: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = rubricCriterionSchema.safeParse({
      name: "",
      weight: 50,
      position: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects name over 200 chars", () => {
    const result = rubricCriterionSchema.safeParse({
      name: "x".repeat(201),
      weight: 50,
      position: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 1000 chars", () => {
    const result = rubricCriterionSchema.safeParse({
      name: "Test",
      description: "x".repeat(1001),
      weight: 50,
      position: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight below minimum (1)", () => {
    const result = rubricCriterionSchema.safeParse({
      name: "Test",
      weight: 0,
      position: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative position", () => {
    const result = rubricCriterionSchema.safeParse({
      name: "Test",
      weight: 50,
      position: -1,
    });
    expect(result.success).toBe(false);
  });
});

// ── updateTaskSchema ─────────────────────────────────────────

describe("updateTaskSchema (extended)", () => {
  it("accepts partial update with just title", () => {
    const result = updateTaskSchema.safeParse({ title: "New Title" });
    expect(result.success).toBe(true);
  });

  it("accepts budget_cents at minimum (100)", () => {
    const result = updateTaskSchema.safeParse({ budget_cents: 100 });
    expect(result.success).toBe(true);
  });

  it("rejects budget_cents below 100", () => {
    const result = updateTaskSchema.safeParse({ budget_cents: 99 });
    expect(result.success).toBe(false);
  });

  it("accepts eval_mode change to llm with null eval_image", () => {
    const result = updateTaskSchema.safeParse({
      eval_mode: "llm",
      eval_image: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts update with special characters in strings", () => {
    const result = updateTaskSchema.safeParse({
      title: "Test <>&\"' task \u00e9\u00e0\u00fc",
      description: "Line1\nLine2\tTabbed",
    });
    expect(result.success).toBe(true);
  });
});

// ── createDealSchema ─────────────────────────────────────────

describe("createDealSchema", () => {
  it("accepts valid output_purchase deal", () => {
    const result = createDealSchema.safeParse({
      taskId: VALID_UUID,
      agentId: VALID_UUID,
      dealType: "output_purchase",
      dealValueCents: 50000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid agent_hire deal", () => {
    const result = createDealSchema.safeParse({
      taskId: VALID_UUID,
      agentId: VALID_UUID,
      dealType: "agent_hire",
      dealValueCents: 100000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts zero deal value", () => {
    const result = createDealSchema.safeParse({
      taskId: VALID_UUID,
      agentId: VALID_UUID,
      dealType: "output_purchase",
      dealValueCents: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID taskId", () => {
    const result = createDealSchema.safeParse({
      taskId: "not-a-uuid",
      agentId: VALID_UUID,
      dealType: "output_purchase",
      dealValueCents: 50000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID agentId", () => {
    const result = createDealSchema.safeParse({
      taskId: VALID_UUID,
      agentId: "bad",
      dealType: "output_purchase",
      dealValueCents: 50000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid deal type", () => {
    const result = createDealSchema.safeParse({
      taskId: VALID_UUID,
      agentId: VALID_UUID,
      dealType: "partnership",
      dealValueCents: 50000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative deal value", () => {
    const result = createDealSchema.safeParse({
      taskId: VALID_UUID,
      agentId: VALID_UUID,
      dealType: "output_purchase",
      dealValueCents: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = createDealSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-integer deal value", () => {
    const result = createDealSchema.safeParse({
      taskId: VALID_UUID,
      agentId: VALID_UUID,
      dealType: "output_purchase",
      dealValueCents: 50000.5,
    });
    expect(result.success).toBe(false);
  });
});
