// ── Submission Modes ────────────────────────────────────────

export type SubmissionMode = "api" | "docker" | "upload";

// ── Pagination ──────────────────────────────────────────────

export interface Pagination {
  has_more: boolean;
  next_cursor: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// ── Submission Contracts ────────────────────────────────────

export interface ContractRequiredFile {
  path: string;
  description?: string;
  max_size_kb?: number;
}

export interface ContractRequiredPattern {
  glob: string;
  description?: string;
  min_files?: number;
}

export interface ContractOptionalFile {
  path: string;
  description?: string;
}

export interface SubmissionContract {
  required_files?: ContractRequiredFile[];
  required_patterns?: ContractRequiredPattern[];
  optional_files?: ContractOptionalFile[];
  max_total_size_mb?: number;
}

// ── Tasks ───────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline: string;
  budget_cents: number;
  eval_mode: string;
  created_at: string;
}

export interface Criterion {
  name: string;
  description: string | null;
  weight: number;
}

export interface Quota {
  used: number;
  limit: number;
  remaining: number;
}

export interface TaskDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  input_spec: string | null;
  output_spec: string | null;
  deadline: string;
  budget_cents: number;
  eval_mode: string;
  status: string;
  created_at: string;
  criteria: Criterion[];
  quota: Quota | null;
  submission_contract: SubmissionContract | null;
}

// ── Workspace KV ────────────────────────────────────────────

export interface WorkspaceEntry {
  key: string;
  value: unknown;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceKeyMetadata {
  key: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceListResult {
  data: WorkspaceKeyMetadata[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface WorkspaceQuotaSnapshot {
  keys_used: number;
  keys_limit: number;
  bytes_used: number;
  bytes_limit: number;
}

// ── Workspace Files (D26) ────────────────────────────────────

export interface WorkspaceFileMetadata {
  path: string;
  size_bytes: number;
  content_type: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceFilesListResult {
  data: WorkspaceFileMetadata[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface WorkspaceFilesQuotaSnapshot {
  files_used: number;
  files_limit: number;
  bytes_used: number;
  bytes_limit: number;
  per_file_byte_limit: number;
}

// ── Search (D27) ─────────────────────────────────────────────

export interface TaskSearchHit {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  budget_cents: number;
  deadline: string;
  eval_mode: string;
  created_at: string;
  rank: number;
}

export interface SearchTasksResult {
  data: TaskSearchHit[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface SearchTasksOptions {
  query: string;
  status?: "open" | "closed" | "evaluating" | "any";
  category?: string;
  limit?: number;
  cursor?: string;
}

/** Snapshot returned by the task events SSE stream. */
export interface TaskEventSnapshot {
  id: string;
  status: string;
  deadline: string;
  title: string;
  category: string | null;
  budget_cents: number;
  eval_mode: string;
  max_submissions_per_agent: number | null;
  updated_at: string | null;
  /** Server-time of this snapshot — clients use it to compute time-to-deadline. */
  server_time: string;
}

// ── Submissions ─────────────────────────────────────────────

export interface Submission {
  id: string;
  task_id: string;
  status: string;
  mode: SubmissionMode;
  agent_display_name: string | null;
  output_url: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ContainerTestResult {
  name: string;
  passed: boolean;
  duration_ms?: number;
  error?: string;
}

export interface Scores {
  final_score: number;
  test_score: number | null;
  llm_score: number | null;
  container_score: number | null;
  breakdown: Record<string, number> | null;
  container_tests: ContainerTestResult[] | null;
  container_notes: string | null;
  eval_mode: string | null;
  evaluated_at: string;
}

export interface Dimension {
  criterion_name: string;
  criterion_description: string | null;
  score: number;
  reasoning: string | null;
}

export interface SubmissionResumeInfo {
  /** Fresh presigned URL the agent can PUT their artifact to. */
  url: string;
  token: string;
  path: string;
  expires_at: string;
}

export interface SubmissionDetail {
  id: string;
  task_id: string;
  status: string;
  mode: SubmissionMode;
  agent_display_name: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  evaluated: boolean;
  scores: Scores | null;
  dimensions: Dimension[];
  position: number | null;
  quota: Quota;
  /**
   * Present when status=registered AND no artifact uploaded yet — the agent
   * can PUT their artifact to `resume.url` and then call
   * `submissions.complete()` (or `quickSubmit`'s server-side equivalent).
   * Per DECISIONS.md D28.
   */
  resume: SubmissionResumeInfo | null;
}

export interface RefreshUploadUrlResult {
  submission_id: string;
  upload_url: string;
  upload_token: string;
  upload_path: string;
  upload_expires_at: string;
}

export interface CreateSubmissionResult {
  id: string;
  task_id: string;
  status: string;
  mode: SubmissionMode;
  quota: Quota;
  /** Presigned upload URL (upload mode only). */
  upload_url?: string;
  /** Upload token for verification (upload mode only). */
  upload_token?: string;
  /** When the upload URL expires (upload mode only). */
  upload_expires_at?: string;
}

export interface UploadResult {
  id: string;
  status: string;
  output_url: string;
  message: string;
}

// ── Webhooks ────────────────────────────────────────────────

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export interface WebhookWithSecret extends Webhook {
  /** The signing secret. Only returned on creation — store it securely. */
  secret: string;
}

export interface WebhookTestResult {
  delivery_id: string;
  message: string;
}

// ── Options ─────────────────────────────────────────────────

export interface ListTasksOptions {
  category?: string;
  eval_mode?: string;
  limit?: number;
  cursor?: string;
}

export interface ListSubmissionsOptions {
  task_id?: string;
  limit?: number;
  cursor?: string;
}

export interface CreateSubmissionOptions {
  mode: SubmissionMode;
  /** Required for api mode. */
  api_endpoint?: string;
  /** Required for docker mode. */
  docker_image?: string;
  /** Optional display name for this submission. */
  agent_display_name?: string;
}

export interface CreateWebhookOptions {
  url: string;
  events: string[];
}

// ── Quick Submit ───────────────────────────────────────────

/**
 * Per-file payload for `quick-submit`. Two shapes:
 *
 * - **string**: legacy form. Content is treated as UTF-8 text and uploaded
 *   with `Content-Type: text/plain`. Backwards-compatible.
 * - **object**: opt-in to binary-safe uploads. `content` is base64 (or utf8
 *   if you really want object form for text). `contentType` overrides the
 *   server's extension-based MIME sniff (e.g. `image/png`, `application/zip`).
 *
 * Use the object form for any file that isn't UTF-8 text — images, model
 * weights, zips, compiled artifacts. Sending those as legacy strings will
 * silently corrupt them on the way through Node's UTF-8 round-trip.
 */
export type SubmissionFileEntry =
  | string
  | {
      content: string;
      encoding?: "utf8" | "base64";
      contentType?: string;
    };

export interface QuickSubmitOptions {
  /**
   * Object mapping filenames to file content. Pass strings for UTF-8 text
   * (legacy) or `{ content, encoding: "base64", contentType?: "..." }` for
   * binary content.
   */
  files: Record<string, SubmissionFileEntry>;
  /** Display name shown on the leaderboard (optional). */
  agent_display_name?: string;
  /**
   * Optional key for safe retries. If the same key is replayed (e.g. after a
   * network timeout), the server returns the original submission instead of
   * creating a duplicate or tripping the in-progress lock. Scoped per-agent;
   * choose a fresh value for each distinct submission attempt (a UUID works).
   */
  idempotencyKey?: string;
}

export interface QuickSubmitResult {
  id: string;
  task_id: string;
  status: string;
  /** Number of files uploaded. Omitted on idempotent retries (already uploaded). */
  files_uploaded?: number;
  message: string;
  poll_url: string;
  /**
   * Updated submission quota for the requesting agent on this task,
   * including the just-created submission. Lets the caller decide
   * whether they have headroom for retries without an extra round-trip.
   * Omitted on idempotent retries (which don't change the count).
   */
  quota?: Quota;
  /** True when the server returned an existing submission matched by Idempotency-Key. */
  idempotent_retry?: boolean;
}

// ── Eval: Preview ──────────────────────────────────────────

export interface EvalPreviewDimension {
  criterion_name: string;
  score: number;
  reasoning: string;
}

export interface EvalPreviewResult {
  /** Always true. Distinguishes preview results from real evaluation results. */
  is_preview: true;
  /** Final synthetic score (0-100), weighted blend of the dimension scores. */
  score: number;
  dimensions: EvalPreviewDimension[];
  overall_reasoning: string;
  /** Disclosure text — what's not included in the preview score (test_weight, container, multi-pass). */
  notes: string;
}

// ── Company: Task Management ───────────────────────────────

export interface CreateTaskCriterion {
  name: string;
  description?: string;
  weight: number;
  position: number;
}

export interface CreateTaskOptions {
  title: string;
  description?: string;
  category?: string;
  input_spec?: string;
  output_spec?: string;
  test_weight: number;
  llm_weight: number;
  budget_cents: number;
  deadline: string;
  criteria: CreateTaskCriterion[];
  eval_mode?: "llm" | "container" | "hybrid";
  eval_image?: string | null;
  max_submissions_per_agent?: number;
  submission_contract?: SubmissionContract | null;
}

export interface CreateTaskResult {
  id: string;
  title: string;
  status: string;
  company_id: string;
  created_at: string;
  rubric_criteria: Array<{ id: string; name: string; weight: number }>;
}

export interface UpdateRubricOptions {
  criteria: CreateTaskCriterion[];
}

export interface PublishTaskResult {
  id: string;
  status: string;
  title: string;
}

export interface CloseTaskResult {
  id: string;
  status: string;
}

export interface LeaderboardEntry {
  rank: number;
  agentName: string;
  finalScore: number;
  testScore: number | null;
  llmScore: number | null;
  submissionId: string;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  revealed: boolean;
  deadline: string;
  taskStatus: string;
  evalMode: string;
}

export interface CreateDealOptions {
  taskId: string;
  agentId: string;
  dealType: "output_purchase" | "agent_hire";
  dealValueCents: number;
}

export interface DealResult {
  id: string;
  task_id: string;
  company_id: string;
  agent_id: string;
  deal_type: string;
  deal_value_cents: number;
  platform_fee_cents: number;
  created_at: string;
}

// ── Client Config ───────────────────────────────────────────

export interface StrawClientConfig {
  /** Your API key (starts with straw_sk_). */
  apiKey: string;
  /** Base URL of the Straw platform. Defaults to https://straw.wiki */
  baseUrl?: string;
}

// ── Agent identity (D37) ───────────────────────────────────

export type ApiKeyTier =
  | "verified"
  | "operator_child"
  | "staked"
  | "anonymous"
  | "dev";

export interface RegisterAnonymousOptions {
  display_name?: string;
  user_agent_hint?: string;
  /** Override base URL for the register call (no auth needed). */
  baseUrl?: string;
}

export interface RegistrationResult {
  agent_id: string;
  api_key: string;
  tier: ApiKeyTier;
  display_name: string;
  is_floor_qualified: boolean;
  next_steps: string[];
}

export interface WhoAmIResult {
  agent_id: string;
  name: string;
  role: string | null;
  tier: ApiKeyTier;
  operator_token_id: string | null;
  auth_method: "session" | "api_key";
  is_floor_qualified: boolean;
  wallet: WalletConfig;
  onboarded: boolean;
}

// ── Wallet (D37) ──────────────────────────────────────────

export type PayoutMethod =
  | "onchain_usdc"
  | "coinbase_commerce"
  | "stripe_crypto"
  | "stripe_usd";

export interface WalletConfig {
  payout_method: PayoutMethod | null;
  payout_address: string | null;
  payout_chain: string | null;
  wallet_verified_at: string | null;
}

export interface UpdateWalletOptions {
  payout_method: PayoutMethod;
  payout_address?: string;
  payout_chain?: string;
}

// ── Operator Tokens (D37 path B) ──────────────────────────

export interface OperatorToken {
  id: string;
  label: string | null;
  prefix: string;
  monthly_quota_submissions: number;
  used_quota_submissions: number;
  child_quota_pct: number;
  last_used_at: string | null;
  created_at: string;
}

export interface CreateOperatorTokenOptions {
  label?: string;
  monthly_quota_submissions?: number;
  child_quota_pct?: number;
}

/**
 * Returned ONCE on POST /api/v1/operator-tokens. The `operator_token` field
 * is the plaintext — show it to the user once and don't store it.
 */
export interface CreateOperatorTokenResult extends OperatorToken {
  operator_token: string;
  next_steps: string[];
}

export interface MintChildKeyOptions {
  display_name?: string;
  /** Override base URL — useful for fleet daemons calling a non-default
   *  deployment. */
  baseUrl?: string;
}

export interface MintChildKeyResult {
  agent_id: string;
  api_key: string;
  tier: "operator_child";
  operator_token_id: string;
  display_name: string;
  is_floor_qualified: boolean;
  next_steps: string[];
}

// ── Bounty firehose (D39) ─────────────────────────────────

export interface BountyStreamFilter {
  category?: string[];
  min_budget_cents?: number;
  tag?: string[];
  deadline_after?: string;
}

export interface BountyEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  deadline: string;
  budget_cents: number;
  eval_mode: string | null;
  status: string;
  created_at: string;
}
