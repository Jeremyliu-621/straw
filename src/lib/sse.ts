/**
 * Server-Sent Events (SSE) helpers.
 *
 * SSE is a one-way push from the server to the client over a single long-lived
 * HTTP connection. We use it as the transport for "subscribe to changes on X"
 * APIs that the polling-tax-fix replaces.
 *
 * Design notes:
 * - Vercel serverless functions cap at 300s. Streams cap themselves at
 *   `STREAM_MAX_DURATION_MS` (slightly under) so clients reconnect cleanly
 *   instead of hitting the platform timeout mid-event.
 * - Heartbeat comments (`: hb\n\n`) every `HEARTBEAT_INTERVAL_MS` keep the
 *   connection from being reaped by intermediaries (Cloudflare, browsers).
 * - The runner function decides when to emit and when to stop. It returns
 *   `{ done: true }` to terminate the stream cleanly (e.g. submission
 *   reached a terminal state).
 * - `signal` is wired to the Request's AbortSignal so client-disconnects
 *   stop polling immediately rather than running until heartbeat times out.
 */

export const SSE_HEARTBEAT_INTERVAL_MS = 25_000;
export const SSE_STREAM_MAX_DURATION_MS = 270_000; // 4m30s; under Vercel's 300s cap

export interface SSEEvent {
  /** Event name. Defaults to "message" if omitted. */
  event?: string;
  /** Event id for client-side Last-Event-ID resume. Optional. */
  id?: string;
  /** Payload — serialized as JSON. */
  data: unknown;
}

/**
 * Format a single SSE event per the spec. Each event is terminated by
 * a blank line. Multi-line `data` is split into multiple `data:` lines
 * (the spec joins them with newlines on the client side).
 */
export function formatSSEEvent(evt: SSEEvent): string {
  const parts: string[] = [];
  if (evt.id !== undefined) parts.push(`id: ${evt.id}`);
  if (evt.event !== undefined) parts.push(`event: ${evt.event}`);
  const json = JSON.stringify(evt.data);
  for (const line of json.split("\n")) {
    parts.push(`data: ${line}`);
  }
  parts.push("");
  parts.push("");
  return parts.join("\n");
}

export interface StreamRunnerContext {
  /** Emit an event to the client. */
  emit: (evt: SSEEvent) => void;
  /** Aborted when the client disconnects or the duration cap fires. */
  signal: AbortSignal;
  /** Sleep helper that respects the abort signal. Returns false if aborted. */
  sleep: (ms: number) => Promise<boolean>;
}

export type StreamRunner = (ctx: StreamRunnerContext) => Promise<void> | void;

/**
 * Build a Response that streams SSE events produced by `runner`.
 *
 * The runner is called once and may emit any number of events via `ctx.emit`.
 * It should return when the stream is logically complete (terminal state).
 * It can also use `ctx.sleep` to pace polling without ignoring disconnect.
 *
 * Heartbeats and the duration cap are managed automatically.
 */
export function makeSSEResponse(req: Request, runner: StreamRunner): Response {
  const encoder = new TextEncoder();

  // Combine the client's disconnect signal with our own duration cap into
  // a single AbortController the runner can listen to.
  const ctrl = new AbortController();
  const onClientAbort = () => ctrl.abort(new Error("client disconnected"));
  req.signal.addEventListener("abort", onClientAbort, { once: true });
  const durationTimer = setTimeout(
    () => ctrl.abort(new Error("stream duration cap reached")),
    SSE_STREAM_MAX_DURATION_MS
  );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // controller already closed; mark and stop
          closed = true;
        }
      };

      const emit = (evt: SSEEvent) => safeEnqueue(formatSSEEvent(evt));

      const sleep = (ms: number): Promise<boolean> =>
        new Promise((resolve) => {
          if (ctrl.signal.aborted) return resolve(false);
          const t = setTimeout(() => {
            ctrl.signal.removeEventListener("abort", onAbort);
            resolve(true);
          }, ms);
          const onAbort = () => {
            clearTimeout(t);
            resolve(false);
          };
          ctrl.signal.addEventListener("abort", onAbort, { once: true });
        });

      // Heartbeat loop — independent of runner cadence.
      const heartbeat = setInterval(() => {
        safeEnqueue(`: hb\n\n`);
      }, SSE_HEARTBEAT_INTERVAL_MS);

      // Initial flush so clients see headers + first byte immediately.
      safeEnqueue(`: open\n\n`);

      try {
        await runner({ emit, signal: ctrl.signal, sleep });
      } catch (err) {
        // Surface the error as a final event so MCP tools can react.
        if (!ctrl.signal.aborted) {
          emit({ event: "error", data: { message: String(err) } });
        }
      } finally {
        clearInterval(heartbeat);
        clearTimeout(durationTimer);
        req.signal.removeEventListener("abort", onClientAbort);
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
    cancel() {
      ctrl.abort(new Error("stream cancelled"));
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      // Disable buffering on intermediaries (nginx, Cloudflare).
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
