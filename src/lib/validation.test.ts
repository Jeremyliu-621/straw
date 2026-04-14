import { describe, it, expect } from "vitest";
import { createTaskSchema } from "./validation";

function validTaskInput() {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  return {
    title: "Build a robust CSV parser for production use",
    description: "We need a CSV parser that handles edge cases.",
    category: "code-generation",
    input_spec: "CSV file via MAP_TASK_INPUT",
    output_spec: "JSON at /output/result.json",
    test_weight: 60,
    llm_weight: 40,
    budget_cents: 50000,
    deadline: deadline.toISOString(),
    criteria: [
      { name: "Correctness", weight: 60, position: 0 },
      { name: "Code Quality", weight: 40, position: 1 },
    ],
  };
}

describe("createTaskSchema", () => {
  it("accepts valid input", () => {
    const result = createTaskSchema.safeParse(validTaskInput());
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const input = { ...validTaskInput(), title: "" };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts empty description", () => {
    const input = { ...validTaskInput(), description: "" };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects weights not summing to 100", () => {
    const input = { ...validTaskInput(), test_weight: 50, llm_weight: 40 };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects rubric weights not summing to 100", () => {
    const input = {
      ...validTaskInput(),
      criteria: [
        { name: "Correctness", weight: 50, position: 0 },
        { name: "Code Quality", weight: 40, position: 1 },
      ],
    };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects zero criteria", () => {
    const input = { ...validTaskInput(), criteria: [] };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects budget below minimum", () => {
    const input = { ...validTaskInput(), budget_cents: 100 };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects deadline in the past", () => {
    const pastDate = new Date("2020-01-01").toISOString();
    const input = { ...validTaskInput(), deadline: pastDate };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts single criterion with weight 100", () => {
    const input = {
      ...validTaskInput(),
      criteria: [{ name: "Overall Quality", weight: 100, position: 0 }],
    };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts pure LLM evaluation (test_weight=0, llm_weight=100)", () => {
    const input = { ...validTaskInput(), test_weight: 0, llm_weight: 100 };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  // ── eval_mode / eval_image ─────────────────────────────────

  describe("eval_mode and eval_image", () => {
    it("defaults eval_mode to llm when omitted", () => {
      const result = createTaskSchema.safeParse(validTaskInput());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eval_mode).toBe("llm");
      }
    });

    it("accepts explicit llm mode without eval_image", () => {
      const input = { ...validTaskInput(), eval_mode: "llm" };
      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts container mode with eval_image", () => {
      const input = {
        ...validTaskInput(),
        eval_mode: "container",
        eval_image: "myorg/eval:latest",
      };
      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts hybrid mode with eval_image", () => {
      const input = {
        ...validTaskInput(),
        eval_mode: "hybrid",
        eval_image: "acme/tests:v2",
      };
      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects container mode without eval_image", () => {
      const input = { ...validTaskInput(), eval_mode: "container" };
      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects hybrid mode without eval_image", () => {
      const input = { ...validTaskInput(), eval_mode: "hybrid" };
      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects container mode with null eval_image", () => {
      const input = {
        ...validTaskInput(),
        eval_mode: "container",
        eval_image: null,
      };
      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects invalid eval_mode value", () => {
      const input = { ...validTaskInput(), eval_mode: "magic" };
      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("accepts llm mode with null eval_image (explicit)", () => {
      const input = {
        ...validTaskInput(),
        eval_mode: "llm",
        eval_image: null,
      };
      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
