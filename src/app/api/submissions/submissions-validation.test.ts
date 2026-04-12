import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import { SUBMISSION_MODE } from "@/constants";

/**
 * Re-declare the submission schemas from route.ts for isolated testing.
 * These mirror the exact schemas used in the API route.
 */
const baseFields = {
  task_id: z.string().uuid(),
  agent_display_name: z.string().min(1).max(100).optional(),
};

const apiSubmissionSchema = z.object({
  ...baseFields,
  mode: z.literal(SUBMISSION_MODE.API),
  api_endpoint: z
    .string()
    .url("Must be a valid URL")
    .refine((u) => u.startsWith("https://"), "Endpoint must use HTTPS"),
});

const dockerSubmissionSchema = z.object({
  ...baseFields,
  mode: z.literal(SUBMISSION_MODE.DOCKER),
  docker_image: z.string().min(1, "Docker image cannot be empty"),
});

const createSubmissionSchema = z.union([apiSubmissionSchema, dockerSubmissionSchema]);

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("createSubmissionSchema", () => {
  describe("API mode", () => {
    it("accepts valid API submission", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "api",
        api_endpoint: "https://my-agent.example.com/solve",
      });
      expect(result.success).toBe(true);
    });

    it("accepts API submission with agent display name", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "api",
        api_endpoint: "https://agent.io/run",
        agent_display_name: "Claude Solver v2",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agent_display_name).toBe("Claude Solver v2");
      }
    });

    it("rejects HTTP endpoint (requires HTTPS)", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "api",
        api_endpoint: "http://insecure.example.com/solve",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing api_endpoint for API mode", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "api",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid URL as api_endpoint", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "api",
        api_endpoint: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-UUID task_id", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: "not-a-uuid",
        mode: "api",
        api_endpoint: "https://valid.example.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Docker mode", () => {
    it("accepts valid Docker submission", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "docker",
        docker_image: "myorg/solver:latest",
      });
      expect(result.success).toBe(true);
    });

    it("accepts Docker submission with display name", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "docker",
        docker_image: "ghcr.io/org/agent:v2",
        agent_display_name: "GPT-4 Solver",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty docker_image", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "docker",
        docker_image: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing docker_image for Docker mode", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "docker",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("mode discrimination", () => {
    it("rejects unknown mode", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "unknown",
        api_endpoint: "https://x.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects API fields with Docker mode", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "docker",
        api_endpoint: "https://wrong-field.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects Docker fields with API mode", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "api",
        docker_image: "wrong-field:latest",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing mode entirely", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        api_endpoint: "https://valid.example.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("agent_display_name", () => {
    it("is optional for both modes", () => {
      const apiResult = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "api",
        api_endpoint: "https://a.com",
      });
      const dockerResult = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "docker",
        docker_image: "img:v1",
      });
      expect(apiResult.success).toBe(true);
      expect(dockerResult.success).toBe(true);
    });

    it("rejects display name over 100 chars", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "api",
        api_endpoint: "https://a.com",
        agent_display_name: "x".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty display name (min 1 char)", () => {
      const result = createSubmissionSchema.safeParse({
        task_id: VALID_UUID,
        mode: "api",
        api_endpoint: "https://a.com",
        agent_display_name: "",
      });
      expect(result.success).toBe(false);
    });
  });
});
