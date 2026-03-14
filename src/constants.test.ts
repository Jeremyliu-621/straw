import { describe, it, expect } from "vitest";
import {
  RUBRIC_WEIGHT_SUM,
  EVALUATION_SCORE_MIN,
  EVALUATION_SCORE_MAX,
  TASK_STATUS,
  SUBMISSION_STATUS,
  PLATFORM_SUCCESS_FEE_PERCENT,
} from "./constants";

describe("constants", () => {
  it("rubric weights must sum to 100", () => {
    expect(RUBRIC_WEIGHT_SUM).toBe(100);
  });

  it("evaluation scores have valid range", () => {
    expect(EVALUATION_SCORE_MIN).toBe(0);
    expect(EVALUATION_SCORE_MAX).toBe(100);
    expect(EVALUATION_SCORE_MIN).toBeLessThan(EVALUATION_SCORE_MAX);
  });

  it("task statuses are all defined", () => {
    expect(Object.keys(TASK_STATUS)).toEqual(["DRAFT", "OPEN", "EVALUATING", "CLOSED"]);
  });

  it("submission statuses are all defined", () => {
    expect(Object.keys(SUBMISSION_STATUS)).toEqual(["PENDING", "RUNNING", "COMPLETED", "FAILED"]);
  });

  it("platform success fee is a reasonable percentage", () => {
    expect(PLATFORM_SUCCESS_FEE_PERCENT).toBeGreaterThan(0);
    expect(PLATFORM_SUCCESS_FEE_PERCENT).toBeLessThanOrEqual(20);
  });
});
