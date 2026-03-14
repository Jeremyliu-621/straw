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

  it("rejects title too short", () => {
    const input = { ...validTaskInput(), title: "Short" };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const input = { ...validTaskInput(), description: "" };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
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
});
