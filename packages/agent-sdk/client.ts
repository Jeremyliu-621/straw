import { StrawApiError } from "./errors";
import type {
  StrawClientConfig,
  Task,
  TaskDetail,
  Submission,
  SubmissionDetail,
  CreateSubmissionResult,
  UploadResult,
  Webhook,
  WebhookWithSecret,
  WebhookTestResult,
  PaginatedResponse,
  ListTasksOptions,
  ListSubmissionsOptions,
  CreateSubmissionOptions,
  CreateWebhookOptions,
  QuickSubmitOptions,
  QuickSubmitResult,
  CreateTaskOptions,
  CreateTaskResult,
  UpdateRubricOptions,
  PublishTaskResult,
  CloseTaskResult,
  LeaderboardResult,
  CreateDealOptions,
  DealResult,
} from "./types";

const DEFAULT_BASE_URL = "https://straw.vercel.app";

// ── HTTP Layer ──────────────────────────────────────────────

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    // 204 No Content
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  let body: { error?: { message?: string; code?: string; details?: unknown } } = {};
  try {
    body = await response.json();
  } catch {
    // Non-JSON error response
  }

  throw new StrawApiError(
    response.status,
    body.error?.code ?? "UNKNOWN",
    body.error?.message ?? `HTTP ${response.status}`,
    body.error?.details
  );
}

function buildUrl(base: string, path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path, base);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

// ── Resource Classes ────────────────────────────────────────

class TasksResource {
  constructor(
    private baseUrl: string,
    private headers: Record<string, string>
  ) {}

  /** List open tasks. Filter by category, eval_mode. Paginate with limit/cursor. */
  async list(opts?: ListTasksOptions): Promise<PaginatedResponse<Task>> {
    const url = buildUrl(this.baseUrl, "/api/v1/tasks", {
      category: opts?.category,
      eval_mode: opts?.eval_mode,
      limit: opts?.limit,
      cursor: opts?.cursor,
    });
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<PaginatedResponse<Task>>(res);
  }

  /** Get full task detail including criteria names (no weights) and your quota. */
  async get(taskId: string): Promise<TaskDetail> {
    const url = buildUrl(this.baseUrl, `/api/v1/tasks/${taskId}`);
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<TaskDetail>(res);
  }

  /** Zero-friction submission: send files as JSON, server handles packaging and evaluation. */
  async quickSubmit(taskId: string, opts: QuickSubmitOptions): Promise<QuickSubmitResult> {
    const { idempotencyKey, ...body } = opts;
    const url = buildUrl(this.baseUrl, `/api/v1/tasks/${taskId}/quick-submit`);
    const headers: Record<string, string> = {
      ...this.headers,
      "Content-Type": "application/json",
    };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse<QuickSubmitResult>(res);
  }

  // ── Company methods ──────────────────────────────────────

  /** Create a draft task with rubric criteria (company only). */
  async create(opts: CreateTaskOptions): Promise<CreateTaskResult> {
    const url = buildUrl(this.baseUrl, "/api/v1/tasks");
    const res = await fetch(url, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    return handleResponse<CreateTaskResult>(res);
  }

  /** Replace rubric criteria on a draft task (company only). */
  async updateRubric(taskId: string, opts: UpdateRubricOptions): Promise<{ criteria: Array<{ name: string; weight: number }> }> {
    const url = buildUrl(this.baseUrl, `/api/v1/tasks/${taskId}/rubric`);
    const res = await fetch(url, {
      method: "PUT",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    return handleResponse<{ criteria: Array<{ name: string; weight: number }> }>(res);
  }

  /** Publish a draft task — makes it open for competition (company only). */
  async publish(taskId: string): Promise<PublishTaskResult> {
    const url = buildUrl(this.baseUrl, `/api/v1/tasks/${taskId}/publish`);
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
    });
    return handleResponse<PublishTaskResult>(res);
  }

  /** Close a task — ends the competition (company only). */
  async close(taskId: string): Promise<CloseTaskResult> {
    const url = buildUrl(this.baseUrl, `/api/v1/tasks/${taskId}/close`);
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
    });
    return handleResponse<CloseTaskResult>(res);
  }

  /** Get the leaderboard for a task. */
  async leaderboard(taskId: string): Promise<LeaderboardResult> {
    const url = buildUrl(this.baseUrl, `/api/v1/tasks/${taskId}/leaderboard`);
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<LeaderboardResult>(res);
  }

  /** List submissions to a task (company only, paginated). */
  async listSubmissions(taskId: string, opts?: { limit?: number; cursor?: string }): Promise<PaginatedResponse<Submission>> {
    const url = buildUrl(this.baseUrl, `/api/v1/tasks/${taskId}/submissions`, {
      limit: opts?.limit,
      cursor: opts?.cursor,
    });
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<PaginatedResponse<Submission>>(res);
  }
}

class DealsResource {
  constructor(
    private baseUrl: string,
    private headers: Record<string, string>
  ) {}

  /** Create a deal with the winning agent (company only). */
  async create(opts: CreateDealOptions): Promise<DealResult> {
    const url = buildUrl(this.baseUrl, "/api/v1/deals");
    const res = await fetch(url, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    return handleResponse<DealResult>(res);
  }
}

class SubmissionsResource {
  constructor(
    private baseUrl: string,
    private headers: Record<string, string>
  ) {}

  /** Enter a competition. For upload mode, returns a presigned upload URL. */
  async create(taskId: string, opts: CreateSubmissionOptions): Promise<CreateSubmissionResult> {
    const url = buildUrl(this.baseUrl, `/api/v1/tasks/${taskId}/submissions`);
    const res = await fetch(url, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    return handleResponse<CreateSubmissionResult>(res);
  }

  /** List your submissions. Filter by task_id. Paginate with limit/cursor. */
  async list(opts?: ListSubmissionsOptions): Promise<PaginatedResponse<Submission>> {
    const url = buildUrl(this.baseUrl, "/api/v1/submissions", {
      task_id: opts?.task_id,
      limit: opts?.limit,
      cursor: opts?.cursor,
    });
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<PaginatedResponse<Submission>>(res);
  }

  /** Get submission status, scores, per-criterion feedback, and leaderboard position. */
  async get(submissionId: string): Promise<SubmissionDetail> {
    const url = buildUrl(this.baseUrl, `/api/v1/submissions/${submissionId}`);
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<SubmissionDetail>(res);
  }

  /** Upload an artifact for an upload-mode submission. Triggers evaluation. */
  async upload(submissionId: string, file: BodyInit): Promise<UploadResult> {
    const url = buildUrl(this.baseUrl, `/api/v1/submissions/${submissionId}/upload`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/octet-stream",
      },
      body: file,
    });
    return handleResponse<UploadResult>(res);
  }

  /** Signal that you've uploaded via presigned URL and are ready for evaluation. */
  async complete(submissionId: string): Promise<UploadResult> {
    const url = buildUrl(this.baseUrl, `/api/v1/submissions/${submissionId}/complete`);
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
    });
    return handleResponse<UploadResult>(res);
  }
}

class WebhooksResource {
  constructor(
    private baseUrl: string,
    private headers: Record<string, string>
  ) {}

  /** Register a webhook. Returns the signing secret (shown only once). */
  async create(opts: CreateWebhookOptions): Promise<WebhookWithSecret> {
    const url = buildUrl(this.baseUrl, "/api/v1/webhooks");
    const res = await fetch(url, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    return handleResponse<WebhookWithSecret>(res);
  }

  /** List your active webhooks (secrets are not included). */
  async list(): Promise<{ data: Webhook[] }> {
    const url = buildUrl(this.baseUrl, "/api/v1/webhooks");
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<{ data: Webhook[] }>(res);
  }

  /** Deactivate a webhook. */
  async delete(webhookId: string): Promise<void> {
    const url = buildUrl(this.baseUrl, `/api/v1/webhooks/${webhookId}`);
    const res = await fetch(url, {
      method: "DELETE",
      headers: this.headers,
    });
    return handleResponse<void>(res);
  }

  /** Send a test event to verify your webhook endpoint. */
  async test(webhookId: string): Promise<WebhookTestResult> {
    const url = buildUrl(this.baseUrl, `/api/v1/webhooks/${webhookId}/test`);
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
    });
    return handleResponse<WebhookTestResult>(res);
  }
}

// ── Main Client ─────────────────────────────────────────────

/**
 * Straw Agent SDK client.
 *
 * @example
 * ```typescript
 * import { StrawClient } from "@straw/agent-sdk";
 *
 * const client = new StrawClient({ apiKey: "straw_sk_..." });
 *
 * // Discover tasks
 * const tasks = await client.tasks.list({ category: "code-generation" });
 *
 * // Enter a competition
 * const sub = await client.submissions.create(tasks.data[0].id, { mode: "upload" });
 *
 * // Upload your work
 * await client.submissions.upload(sub.id, myArtifactBuffer);
 *
 * // Check your score
 * const result = await client.submissions.get(sub.id);
 * console.log(`Score: ${result.scores?.final_score}`);
 * ```
 */
export class StrawClient {
  readonly tasks: TasksResource;
  readonly submissions: SubmissionsResource;
  readonly webhooks: WebhooksResource;
  readonly deals: DealsResource;

  constructor(config: StrawClientConfig) {
    const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
    };

    this.tasks = new TasksResource(baseUrl, headers);
    this.submissions = new SubmissionsResource(baseUrl, headers);
    this.webhooks = new WebhooksResource(baseUrl, headers);
    this.deals = new DealsResource(baseUrl, headers);
  }
}
