import { describe, it, expect, vi } from "vitest";
import { StrawClient } from "./client";

/**
 * Tests for the SSE consumer side: parsing the wire format, terminal-event
 * detection, reconnect-on-non-terminal-close, timeout/abort behaviour.
 *
 * We mock global fetch so the client's `stream`/`waitUntilDone` think they're
 * talking to a real SSE endpoint. Each test pushes a synthetic body stream
 * with the events the test wants to drive.
 */

function makeStreamBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const c of chunks) {
        controller.enqueue(encoder.encode(c));
        await new Promise((r) => setTimeout(r, 1));
      }
      controller.close();
    },
  });
}

function mockSSEResponse(chunks: string[]): Response {
  return new Response(makeStreamBody(chunks), {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("SDK SSE parsing", () => {
  it("yields events delimited by blank lines", async () => {
    const client = new StrawClient({ apiKey: "straw_sk_test" });
    const calls: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mockSSEResponse([
          ": open\n\n",
          `event: submission\ndata: {"id":"s1","status":"running"}\n\n`,
          `event: terminal\ndata: {"status":"completed"}\n\n`,
        ])
      )
    );

    const handle = client.submissions.stream("s1", (evt) => {
      calls.push(`${evt.event}:${JSON.stringify(evt.data)}`);
    });
    await handle.done;

    expect(calls).toEqual([
      `submission:{"id":"s1","status":"running"}`,
      `terminal:{"status":"completed"}`,
    ]);

    vi.unstubAllGlobals();
  });

  it("ignores comment heartbeat lines (`: hb`)", async () => {
    const client = new StrawClient({ apiKey: "straw_sk_test" });
    const calls: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mockSSEResponse([
          ": open\n\n",
          `: hb\n\n`,
          `event: terminal\ndata: {"status":"failed"}\n\n`,
        ])
      )
    );

    await client.submissions.stream("s1", (evt) => calls.push(evt.event)).done;
    expect(calls).toEqual(["terminal"]);

    vi.unstubAllGlobals();
  });

  it("handles multi-chunk arrival (event split across reads)", async () => {
    const client = new StrawClient({ apiKey: "straw_sk_test" });
    const calls: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mockSSEResponse([
          ": open\n\n",
          // Split a single event across two chunks at an awkward boundary.
          `event: submission\ndata: {"id":`,
          `"s1","status":"running"}\n\n`,
          `event: terminal\ndata: {"status":"completed"}\n\n`,
        ])
      )
    );

    await client.submissions.stream("s1", (evt) => calls.push(evt.event)).done;
    expect(calls).toEqual(["submission", "terminal"]);

    vi.unstubAllGlobals();
  });

  it("waitUntilDone resolves with the final SubmissionDetail on terminal", async () => {
    const client = new StrawClient({ apiKey: "straw_sk_test" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mockSSEResponse([
          `event: submission\ndata: {"id":"s1","status":"running","scores":null}\n\n`,
          `event: submission\ndata: {"id":"s1","status":"completed","scores":{"final_score":91}}\n\n`,
          `event: terminal\ndata: {"status":"completed"}\n\n`,
        ])
      )
    );

    const result = await client.submissions.waitUntilDone("s1");
    expect((result as unknown as { id: string; status: string; scores: { final_score: number } }))
      .toMatchObject({ id: "s1", status: "completed", scores: { final_score: 91 } });

    vi.unstubAllGlobals();
  });

  it("waitUntilDone honors timeoutMs and throws WAIT_ABORTED", async () => {
    const client = new StrawClient({ apiKey: "straw_sk_test" });

    vi.stubGlobal(
      "fetch",
      // Hang forever — never close the body.
      vi.fn(async () => {
        const stream = new ReadableStream({
          start() { /* never enqueue, never close */ },
        });
        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      })
    );

    await expect(
      client.submissions.waitUntilDone("s1", { timeoutMs: 50 })
    ).rejects.toMatchObject({ code: "WAIT_ABORTED" });

    vi.unstubAllGlobals();
  });

  it("stream throws StrawApiError on non-2xx open", async () => {
    const client = new StrawClient({ apiKey: "straw_sk_test" });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { message: "Not your submission", code: "FORBIDDEN" } }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          )
      )
    );

    const handle = client.submissions.stream("s1", () => {});
    await expect(handle.done).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    vi.unstubAllGlobals();
  });
});
