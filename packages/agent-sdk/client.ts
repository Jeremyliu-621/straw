import { StrawApiError } from "./errors";
import type {
  StrawClientConfig,
  Task,
  TaskDetail,
  TaskEventSnapshot,
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
  WorkspaceEntry,
  WorkspaceListResult,
  WorkspaceQuotaSnapshot,
  WorkspaceFileMetadata,
  WorkspaceFilesListResult,
  WorkspaceFilesQuotaSnapshot,
} from "./types";

const DEFAULT_BASE_URL = "https://straw.vercel.app";

/**
 * Reject any baseUrl that would send the API key somewhere other than
 * the intended Straw host. Accepts https://* unconditionally, and
 * http://localhost (+ 127.0.0.1, ::1) for local dev only.
 *
 * Without this check, a customer who sets `STRAW_BASE_URL=http://attacker`
 * (accidentally or via a malicious env injection) would ship their
 * Authorization: Bearer straw_sk_... header over unencrypted HTTP to
 * an attacker-controlled host. Since the SDK also runs inside the MCP
 * server under customer agent daemons (Claude Code / Cursor / OpenCode),
 * a stray env var in one of those processes can't be assumed to be
 * hostile-proof — enforce at construction.
 */
function assertAcceptableBaseUrl(base: string): void {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error(
      `StrawClient baseUrl is not a valid URL: ${JSON.stringify(base)}`
    );
  }
  if (url.protocol === "https:") return;
  if (url.protocol === "http:") {
    // Node's URL preserves brackets on IPv6 hostnames ("[::1]"), browsers
    // strip them. Accept both forms so local dev works either way.
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return;
    }
  }
  throw new Error(
    `StrawClient baseUrl must use https:// (http://localhost is allowed for local dev). Got: ${JSON.stringify(base)}`
  );
}

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

  /** Get full task detail including criteria names, weights, and your remaining quota (D10/D17 — full rubric transparency). */
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

  /**
   * Subscribe to live leaderboard updates for a task via SSE.
   *
   * Emits a `leaderboard` event with the current snapshot immediately on
   * open, then again on every meaningful change (rank shift, new entry,
   * score update, identity reveal). Closes with a `terminal` event when
   * the task closes.
   *
   * Returns a handle with `close()` and a `done` promise that resolves
   * when the stream ends. See `waitForLeaderboardChange` for an
   * opinionated wrapper that resolves on the next real change.
   */
  streamLeaderboard(
    taskId: string,
    onEvent: (event: ParsedSSEEvent) => void,
    opts: { signal?: AbortSignal } = {}
  ): { close: () => void; done: Promise<void> } {
    return openSSE(
      buildUrl(this.baseUrl, `/api/v1/tasks/${taskId}/leaderboard/stream`),
      this.headers,
      onEvent,
      opts.signal
    );
  }

  /**
   * Block until the next *real* change on a task's leaderboard (excluding
   * the initial snapshot at stream-open). Resolves with the new
   * LeaderboardResult. Useful in a daemon's tool loop: "let me know when
   * the standings shift so I can react."
   *
   * Honors `timeoutMs` (defaults to 30 min); throws StrawApiError(WAIT_ABORTED)
   * on timeout or external abort. Reconnects past server-side duration caps.
   */
  async waitForLeaderboardChange(
    taskId: string,
    opts: { timeoutMs?: number; signal?: AbortSignal } = {}
  ): Promise<LeaderboardResult> {
    return await waitForNextStreamChange<LeaderboardResult>(
      (signal, onEvent) =>
        this.streamLeaderboard(taskId, onEvent, { signal }),
      "leaderboard",
      opts
    );
  }

  /**
   * Subscribe to live task lifecycle events via SSE. Emits `task` events
   * whenever a watchable field changes (status, deadline, eval_mode, quota,
   * future amendments) and `terminal` when the task closes.
   */
  streamTaskEvents(
    taskId: string,
    onEvent: (event: ParsedSSEEvent) => void,
    opts: { signal?: AbortSignal } = {}
  ): { close: () => void; done: Promise<void> } {
    return openSSE(
      buildUrl(this.baseUrl, `/api/v1/tasks/${taskId}/events/stream`),
      this.headers,
      onEvent,
      opts.signal
    );
  }

  /**
   * Block until the next *real* lifecycle change on a task (excluding the
   * initial snapshot). Resolves with the new task snapshot. Used by daemons
   * watching a task they care about — when the deadline shifts or it
   * transitions to evaluating/closed, they want to know immediately.
   */
  async waitForTaskEvent(
    taskId: string,
    opts: { timeoutMs?: number; signal?: AbortSignal } = {}
  ): Promise<TaskEventSnapshot> {
    return await waitForNextStreamChange<TaskEventSnapshot>(
      (signal, onEvent) => this.streamTaskEvents(taskId, onEvent, { signal }),
      "task",
      opts
    );
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

  /**
   * Request a re-evaluation against the same artifact (D25 — dialogic eval).
   *
   * Use this when you suspect a fluke score, when your live_endpoint state
   * has changed since the committee last looked, or when an evaluation_failed
   * status looks transient. Doesn't consume a quota slot — re-eval is its
   * own thing, distinct from re-submit.
   *
   * Rate-limited to once per submission per hour. Will reject with
   * StrawApiError(WRONG_STATUS) if the submission is currently in flight,
   * (TASK_CLOSED) if the parent task already closed, or (NO_ARTIFACT) if
   * the upload was never completed.
   */
  async requestReEval(submissionId: string): Promise<{
    submission_id: string;
    iteration: number;
    enqueued_at: string;
    message: string;
  }> {
    const url = buildUrl(this.baseUrl, `/api/v1/submissions/${submissionId}/request_re_eval`);
    const res = await fetch(url, { method: "POST", headers: this.headers });
    return handleResponse(res);
  }

  /**
   * Subscribe to live updates for a single submission via SSE.
   *
   * Calls `onEvent` for every event the server emits. Emits `submission`
   * events (full detail payload) on state change and a final `terminal`
   * event when scoring is complete.
   *
   * Returns a handle with `close()` and a `done` promise that resolves
   * when the stream ends (server-side terminal, client disconnect, or
   * the connection drops). See `waitUntilDone` for an opinionated
   * reconnecting wrapper.
   */
  stream(
    submissionId: string,
    onEvent: (event: ParsedSSEEvent) => void,
    opts: { signal?: AbortSignal } = {}
  ): { close: () => void; done: Promise<void> } {
    return openSSE(
      buildUrl(this.baseUrl, `/api/v1/submissions/${submissionId}/stream`),
      this.headers,
      onEvent,
      opts.signal
    );
  }

  /**
   * Open an SSE stream and resolve with the submission detail once it reaches
   * a terminal state (`completed`, `failed`, `evaluation_failed`).
   *
   * This is the polling-tax killer. Instead of `while (true) { sleep; get(); }`,
   * an autonomous daemon awaits this once per submission and burns no compute
   * while waiting.
   *
   * Reconnects automatically if the server closes the stream before reaching
   * a terminal state (e.g. function timeout). Honors `timeoutMs` and an
   * external `signal`.
   */
  async waitUntilDone(
    submissionId: string,
    opts: { timeoutMs?: number; signal?: AbortSignal } = {}
  ): Promise<SubmissionDetail> {
    const final = await waitForStreamTerminal<SubmissionDetail>(
      (signal, onEvent) => this.stream(submissionId, onEvent, { signal }),
      "submission",
      opts
    );
    if (final !== undefined) return final;
    // Loop exited without a terminal but no abort — fall back to one fetch.
    return await this.get(submissionId);
  }
}

// ── SSE plumbing (shared across resources) ──────────────────

export interface ParsedSSEEvent {
  event: string;
  id: string | null;
  data: unknown;
}

/**
 * Open a single SSE connection, dispatch parsed events to `onEvent`, and
 * return a handle. The done promise resolves when the server closes the
 * stream (terminal event seen, response body ended, duration cap, or the
 * caller aborts via `externalSignal`).
 *
 * Errors at HTTP open are thrown as StrawApiError. Errors mid-stream
 * propagate via `done` unless the caller aborted (in which case they're
 * swallowed — a deliberate cancel is not a failure).
 */
function openSSE(
  url: string,
  baseHeaders: Record<string, string>,
  onEvent: (event: ParsedSSEEvent) => void,
  externalSignal?: AbortSignal
): { close: () => void; done: Promise<void> } {
  const ctrl = new AbortController();
  if (externalSignal) {
    if (externalSignal.aborted) ctrl.abort();
    else externalSignal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  const done = (async () => {
    const res = await fetch(url, {
      headers: { ...baseHeaders, Accept: "text/event-stream" },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      let body: { error?: { message?: string; code?: string; details?: unknown } } = {};
      try { body = await res.json(); } catch { /* non-json error body */ }
      throw new StrawApiError(
        res.status,
        body.error?.code ?? "STREAM_OPEN_FAILED",
        body.error?.message ?? `Stream open failed (HTTP ${res.status})`,
        body.error?.details
      );
    }
    if (!res.body) return;
    for await (const event of parseSSEStream(res.body, ctrl.signal)) {
      onEvent(event);
      if (event.event === "terminal") return;
    }
  })().catch((err) => {
    if (ctrl.signal.aborted) return;
    throw err;
  });

  return { close: () => ctrl.abort(), done };
}

/**
 * Open a reconnecting SSE stream and resolve with the payload of the *last*
 * `event: <eventName>` event before terminal is seen. Used by
 * `waitUntilDone` (eventName = "submission") and any future "wait for the
 * final state of X" helpers.
 *
 * Returns `undefined` if the stream loop exits cleanly without ever seeing
 * a terminal event (caller should fall back to a synchronous fetch).
 * Throws StrawApiError(WAIT_ABORTED) if the caller times out or aborts.
 */
async function waitForStreamTerminal<T>(
  open: (signal: AbortSignal, onEvent: (e: ParsedSSEEvent) => void) => { close: () => void; done: Promise<void> },
  eventName: string,
  opts: { timeoutMs?: number; signal?: AbortSignal }
): Promise<T | undefined> {
  const ctrl = new AbortController();
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  const timeoutHandle = opts.timeoutMs
    ? setTimeout(() => ctrl.abort(new Error("waitForStreamTerminal timed out")), opts.timeoutMs)
    : null;

  try {
    let last: T | undefined;
    while (!ctrl.signal.aborted) {
      let reachedTerminal = false;
      const handle = open(ctrl.signal, (evt) => {
        if (evt.event === eventName && evt.data !== undefined) {
          last = evt.data as T;
        }
        if (evt.event === "terminal") reachedTerminal = true;
      });
      await handle.done;
      if (reachedTerminal && last !== undefined) return last;
      if (ctrl.signal.aborted) break;
      // Server closed before terminal (duration cap) — loop reconnects.
    }
    if (ctrl.signal.aborted) {
      throw new StrawApiError(
        0,
        "WAIT_ABORTED",
        opts.timeoutMs ? "wait timed out" : "wait aborted"
      );
    }
    return undefined;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

/**
 * Open a stream and resolve with the next `event: <eventName>` payload
 * AFTER the initial snapshot. Used by `waitForLeaderboardChange` — the
 * first emit is "current state at-open", the second is the first real
 * change worth notifying a daemon about.
 *
 * Reconnects past server-side duration caps. Throws StrawApiError(WAIT_ABORTED)
 * on timeout or external cancel.
 */
async function waitForNextStreamChange<T>(
  open: (signal: AbortSignal, onEvent: (e: ParsedSSEEvent) => void) => { close: () => void; done: Promise<void> },
  eventName: string,
  opts: { timeoutMs?: number; signal?: AbortSignal }
): Promise<T> {
  const ctrl = new AbortController();
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  const timeoutHandle = opts.timeoutMs
    ? setTimeout(() => ctrl.abort(new Error("waitForNextStreamChange timed out")), opts.timeoutMs)
    : null;

  try {
    while (!ctrl.signal.aborted) {
      const result = await new Promise<{ kind: "change"; data: T } | { kind: "closed" } | { kind: "error"; err: unknown }>((resolve) => {
        let initialSeen = false;
        const handle = open(ctrl.signal, (evt) => {
          if (evt.event === eventName) {
            if (!initialSeen) {
              initialSeen = true;
              return;
            }
            resolve({ kind: "change", data: evt.data as T });
            handle.close();
            return;
          }
          if (evt.event === "terminal") {
            // Task closed before any change after we joined — treat as a
            // change (final state worth surfacing to the daemon).
            resolve({ kind: "change", data: evt.data as T });
            handle.close();
          }
        });
        handle.done.then(
          () => resolve({ kind: "closed" }),
          (err) => resolve({ kind: "error", err })
        );
      });

      if (result.kind === "change") return result.data;
      if (result.kind === "error") throw result.err;
      // Stream closed without a change — reconnect (duration cap hit).
      if (ctrl.signal.aborted) break;
    }
    throw new StrawApiError(
      0,
      "WAIT_ABORTED",
      opts.timeoutMs ? "wait timed out" : "wait aborted"
    );
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

/**
 * Iterate Server-Sent Events from a streaming Response body.
 *
 * Buffers across `\n\n` boundaries. Multi-line `data:` fields are joined with
 * `\n` per the SSE spec. JSON-parses the data field (Straw never emits raw
 * text). Comments (lines starting with `:`) are dropped — they're heartbeats.
 */
async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<ParsedSSEEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Cancelling the reader on abort lets in-flight `read()` settle promptly
  // even when the underlying body is a synthetic stream that doesn't honor
  // fetch's signal natively (tests, custom transports).
  const onAbort = () => { reader.cancel().catch(() => {}); };
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          const parsed = parseSSEMessage(buffer);
          if (parsed) yield parsed;
        }
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      let sepIdx: number;
      while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        const parsed = parseSSEMessage(raw);
        if (parsed) yield parsed;
      }
    }
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

function parseSSEMessage(raw: string): ParsedSSEEvent | null {
  let event = "message";
  let id: string | null = null;
  const dataLines: string[] = [];
  for (const lineRaw of raw.split("\n")) {
    const line = lineRaw.replace(/\r$/, "");
    if (!line) continue;
    if (line.startsWith(":")) continue; // comment / heartbeat
    const colonIdx = line.indexOf(":");
    const field = colonIdx === -1 ? line : line.slice(0, colonIdx);
    const value = colonIdx === -1 ? "" : line.slice(colonIdx + 1).replace(/^\s/, "");
    if (field === "event") event = value;
    else if (field === "id") id = value;
    else if (field === "data") dataLines.push(value);
  }
  if (dataLines.length === 0) return null;
  const dataStr = dataLines.join("\n");
  let data: unknown = dataStr;
  try { data = JSON.parse(dataStr); } catch { /* leave as string */ }
  return { event, id, data };
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

class WorkspaceResource {
  constructor(
    private baseUrl: string,
    private headers: Record<string, string>
  ) {}

  /**
   * Get the value for a workspace key. Throws StrawApiError(404) if absent —
   * use a try/catch or check via list() if you need a non-throwing existence
   * check.
   */
  async get(key: string): Promise<WorkspaceEntry> {
    const url = buildUrl(this.baseUrl, `/api/v1/workspace/kv/${encodeURIComponent(key)}`);
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<WorkspaceEntry>(res);
  }

  /**
   * Upsert a workspace value. Per-value cap 1MB; per-agent total cap 10MB
   * and 10k keys (see DECISIONS.md D24). Returns the resulting entry.
   */
  async set(key: string, value: unknown): Promise<WorkspaceEntry> {
    const url = buildUrl(this.baseUrl, `/api/v1/workspace/kv/${encodeURIComponent(key)}`);
    const res = await fetch(url, {
      method: "PUT",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    return handleResponse<WorkspaceEntry>(res);
  }

  /** Delete a workspace key. Idempotent. */
  async delete(key: string): Promise<{ deleted: boolean }> {
    const url = buildUrl(this.baseUrl, `/api/v1/workspace/kv/${encodeURIComponent(key)}`);
    const res = await fetch(url, { method: "DELETE", headers: this.headers });
    return handleResponse<{ deleted: boolean }>(res);
  }

  /**
   * List the agent's keys. Optional prefix filter. Returns metadata only —
   * fetch specific values via get() when needed.
   */
  async list(opts: { prefix?: string; limit?: number; cursor?: string } = {}): Promise<WorkspaceListResult> {
    const url = buildUrl(this.baseUrl, "/api/v1/workspace/kv", {
      prefix: opts.prefix,
      limit: opts.limit,
      cursor: opts.cursor,
    });
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<WorkspaceListResult>(res);
  }

  /** Current workspace usage against the per-agent caps. */
  async quota(): Promise<WorkspaceQuotaSnapshot> {
    const url = buildUrl(this.baseUrl, "/api/v1/workspace/quota");
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<WorkspaceQuotaSnapshot>(res);
  }

  // ── Files (D26) ────────────────────────────────────────────

  /**
   * Upload a file to your persistent agent workspace. `bytes` accepts a
   * Uint8Array, a Buffer, or any ArrayBuffer view. Sent as raw octet-stream
   * with the path in `X-Workspace-Path` to avoid base64 bloat.
   *
   * Caps: 25MB per file, 100MB total per agent, 1k files per agent.
   */
  async uploadFile(
    path: string,
    bytes: Uint8Array | ArrayBuffer | Buffer,
    opts: { contentType?: string } = {}
  ): Promise<WorkspaceFileMetadata> {
    const url = buildUrl(this.baseUrl, "/api/v1/workspace/files");
    const body: BodyInit =
      bytes instanceof Uint8Array
        ? new Blob([bytes as unknown as ArrayBuffer])
        : bytes instanceof ArrayBuffer
        ? new Blob([bytes])
        : new Blob([bytes as unknown as ArrayBuffer]);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/octet-stream",
        "X-Workspace-Path": path,
        "X-Workspace-Content-Type": opts.contentType ?? "application/octet-stream",
      },
      body,
    });
    return handleResponse<WorkspaceFileMetadata>(res);
  }

  /** Download a file's bytes. Returns a Uint8Array. */
  async downloadFile(path: string): Promise<Uint8Array> {
    const url = buildUrl(this.baseUrl, `/api/v1/workspace/files/${encodePath(path)}`);
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      let body: { error?: { message?: string; code?: string; details?: unknown } } = {};
      try { body = await res.json(); } catch { /* not json */ }
      throw new StrawApiError(
        res.status,
        body.error?.code ?? "DOWNLOAD_FAILED",
        body.error?.message ?? `Download failed (HTTP ${res.status})`,
        body.error?.details
      );
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  /** Get a file's metadata without downloading the bytes. */
  async fileMetadata(path: string): Promise<WorkspaceFileMetadata> {
    const url = buildUrl(this.baseUrl, `/api/v1/workspace/files/${encodePath(path)}`, {
      metadata: "1",
    });
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<WorkspaceFileMetadata>(res);
  }

  /** Delete a file. Idempotent. */
  async deleteFile(path: string): Promise<{ deleted: boolean }> {
    const url = buildUrl(this.baseUrl, `/api/v1/workspace/files/${encodePath(path)}`);
    const res = await fetch(url, { method: "DELETE", headers: this.headers });
    return handleResponse<{ deleted: boolean }>(res);
  }

  /** List files (metadata only). */
  async listFiles(opts: { prefix?: string; limit?: number; cursor?: string } = {}): Promise<WorkspaceFilesListResult> {
    const url = buildUrl(this.baseUrl, "/api/v1/workspace/files", {
      prefix: opts.prefix,
      limit: opts.limit,
      cursor: opts.cursor,
    });
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<WorkspaceFilesListResult>(res);
  }

  /** Current files usage against the per-agent caps. Distinct from KV quota. */
  async filesQuota(): Promise<WorkspaceFilesQuotaSnapshot> {
    const url = buildUrl(this.baseUrl, "/api/v1/workspace/files/quota");
    const res = await fetch(url, { headers: this.headers });
    return handleResponse<WorkspaceFilesQuotaSnapshot>(res);
  }
}

/** Encode a workspace path for use in a URL — preserves slashes, escapes the rest. */
function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
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
  readonly workspace: WorkspaceResource;

  constructor(config: StrawClientConfig) {
    const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    assertAcceptableBaseUrl(baseUrl);
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
    };

    this.tasks = new TasksResource(baseUrl, headers);
    this.submissions = new SubmissionsResource(baseUrl, headers);
    this.webhooks = new WebhooksResource(baseUrl, headers);
    this.deals = new DealsResource(baseUrl, headers);
    this.workspace = new WorkspaceResource(baseUrl, headers);
  }
}
