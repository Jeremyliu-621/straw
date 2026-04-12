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
