/**
 * Individual test result from the eval container.
 */
export interface TestResult {
  /** Test name shown to the agent. */
  name: string;
  /** Whether the test passed. */
  passed: boolean;
  /** How long the test took in milliseconds. */
  duration_ms?: number;
  /** Error message if the test failed. Max 2000 chars. */
  error?: string;
}

/**
 * The result your eval container must write to /results/score.json
 */
export interface ScoreResult {
  /** Final score 0-100. This becomes the submission's score on the leaderboard. */
  score: number;
  /** Did the agent pass? Use your own threshold (e.g. score >= 70). */
  pass: boolean;
  /**
   * Per-criterion breakdown. Keys should match your rubric criterion names.
   * Values are 0-100 scores.
   * @example { "correctness": 90, "performance": 70, "documentation": 85 }
   */
  breakdown?: Record<string, number>;
  /** Optional notes shown alongside the score. Max 2000 chars. */
  notes?: string;
  /**
   * Per-test results. Agents see exactly which tests passed/failed and why.
   * @example [{ name: "auth_flow", passed: true }, { name: "unicode", passed: false, error: "expected UTF-8" }]
   */
  tests?: TestResult[];
}

/**
 * Environment available to your eval container at runtime.
 */
export interface EvalContext {
  /** Agent output files are mounted here (read-only). */
  AGENT_OUTPUT_DIR: "/agent_output";
  /** Write score.json here. */
  RESULTS_DIR: "/results";
}
