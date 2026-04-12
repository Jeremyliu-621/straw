import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import { EVAL_MODE } from "@/constants";

// Re-declare the updateTaskSchema from route.ts for isolated testing
const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  input_spec: z.string().min(1).optional(),
  output_spec: z.string().min(1).optional(),
  budget_cents: z.number().int().min(100).optional(),
  deadline: z.string().optional(),
  eval_mode: z.enum([EVAL_MODE.LLM, EVAL_MODE.CONTAINER, EVAL_MODE.HYBRID]).optional(),
  eval_image: z.string().min(1).nullable().optional(),
}).refine(
  (data) => {
    if (data.eval_mode && data.eval_mode !== EVAL_MODE.LLM && data.eval_image === null) {
      return false;
    }
    return true;
  },
  { message: "eval_image required for container/hybrid modes", path: ["eval_image"] }
);

describe("updateTaskSchema", () => {
  describe("valid updates", () => {
    it("accepts partial title update", () => {
      const result = updateTaskSchema.safeParse({ title: "New Title" });
      expect(result.success).toBe(true);
    });

    it("accepts eval_mode change to container with image", () => {
      const result = updateTaskSchema.safeParse({
        eval_mode: "container",
        eval_image: "myorg/eval:latest",
      });
      expect(result.success).toBe(true);
    });

    it("accepts eval_mode change to hybrid with image", () => {
      const result = updateTaskSchema.safeParse({
        eval_mode: "hybrid",
        eval_image: "myorg/eval:v2",
      });
      expect(result.success).toBe(true);
    });

    it("accepts eval_mode change to llm without image", () => {
      const result = updateTaskSchema.safeParse({
        eval_mode: "llm",
      });
      expect(result.success).toBe(true);
    });

    it("accepts eval_mode llm with null eval_image", () => {
      const result = updateTaskSchema.safeParse({
        eval_mode: "llm",
        eval_image: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts multiple field updates", () => {
      const result = updateTaskSchema.safeParse({
        title: "Updated Title",
        description: "Updated description",
        budget_cents: 50000,
        eval_mode: "container",
        eval_image: "acme/tests:latest",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object (caught later as no-op)", () => {
      const result = updateTaskSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("invalid updates", () => {
    it("rejects container mode without eval_image", () => {
      const result = updateTaskSchema.safeParse({
        eval_mode: "container",
        eval_image: null,
      });
      expect(result.success).toBe(false);
    });

    it("rejects hybrid mode without eval_image", () => {
      const result = updateTaskSchema.safeParse({
        eval_mode: "hybrid",
        eval_image: null,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid eval_mode value", () => {
      const result = updateTaskSchema.safeParse({
        eval_mode: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty title", () => {
      const result = updateTaskSchema.safeParse({
        title: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects budget_cents below minimum", () => {
      const result = updateTaskSchema.safeParse({
        budget_cents: 50,
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty eval_image string for container mode", () => {
      const result = updateTaskSchema.safeParse({
        eval_mode: "container",
        eval_image: "",
      });
      expect(result.success).toBe(false);
    });
  });
});
