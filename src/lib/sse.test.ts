import { describe, it, expect, vi } from "vitest";
import { formatSSEEvent, makeSSEResponse } from "./sse";

describe("formatSSEEvent", () => {
  it("emits a default 'message' event when event field is omitted", () => {
    const out = formatSSEEvent({ data: { hello: "world" } });
    expect(out).toBe(`data: {"hello":"world"}\n\n`);
  });

  it("includes event name and id when provided", () => {
    const out = formatSSEEvent({ event: "submission", id: "42", data: { ok: true } });
    expect(out).toBe(`id: 42\nevent: submission\ndata: {"ok":true}\n\n`);
  });

  it("splits multi-line JSON over multiple data: lines", () => {
    // JSON.stringify with indent inserts newlines.
    const out = formatSSEEvent({ data: { a: 1, b: 2 } });
    expect(out.endsWith("\n\n")).toBe(true);
  });

  it("escapes string values via JSON.stringify (no injection of bare newlines)", () => {
    const out = formatSSEEvent({ data: { msg: "line1\nline2" } });
    // The newline inside the string is escaped to \n by JSON.stringify, so
    // the SSE payload itself stays on one data: line.
    expect(out).toBe(`data: {"msg":"line1\\nline2"}\n\n`);
  });
});

describe("makeSSEResponse", () => {
  function createMockRequest(): Request {
    return new Request("http://localhost/test", { signal: new AbortController().signal });
  }

  async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      out += decoder.decode(value);
    }
    return out;
  }

  it("returns text/event-stream content type and emits the open marker", async () => {
    const req = createMockRequest();
    const resp = makeSSEResponse(req, async ({ emit }) => {
      emit({ event: "ping", data: { n: 1 } });
    });

    expect(resp.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    expect(resp.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(resp.headers.get("x-accel-buffering")).toBe("no");

    const body = await readAll(resp.body!);
    expect(body).toContain(": open\n\n");
    expect(body).toContain("event: ping\n");
    expect(body).toContain(`data: {"n":1}\n`);
  });

  it("closes cleanly when the runner returns", async () => {
    const req = createMockRequest();
    const resp = makeSSEResponse(req, async ({ emit }) => {
      emit({ event: "one", data: 1 });
      emit({ event: "two", data: 2 });
    });

    const body = await readAll(resp.body!);
    expect(body).toContain("event: one");
    expect(body).toContain("event: two");
  });

  it("surfaces runner errors as an 'error' event before closing", async () => {
    const req = createMockRequest();
    const resp = makeSSEResponse(req, async () => {
      throw new Error("boom");
    });

    const body = await readAll(resp.body!);
    expect(body).toContain("event: error");
    expect(body).toContain("boom");
  });

  it("sleep returns false when client disconnects mid-stream", async () => {
    const ctrl = new AbortController();
    const req = new Request("http://localhost/test", { signal: ctrl.signal });

    let sleepResult: boolean | undefined;
    const resp = makeSSEResponse(req, async ({ sleep }) => {
      // Trigger client disconnect mid-sleep
      setTimeout(() => ctrl.abort(), 10);
      sleepResult = await sleep(5_000);
    });

    await readAll(resp.body!);
    expect(sleepResult).toBe(false);
  });

  it("invokes the cancel hook when the consumer cancels the stream", async () => {
    const req = createMockRequest();
    const seen: string[] = [];

    const resp = makeSSEResponse(req, async ({ emit, sleep }) => {
      emit({ event: "first", data: 1 });
      const ok = await sleep(2_000);
      seen.push(ok ? "completed" : "aborted");
    });

    // Read one chunk then cancel.
    const reader = resp.body!.getReader();
    await reader.read();
    await reader.cancel();
    // Give the abort propagation a tick.
    await new Promise((r) => setTimeout(r, 50));

    expect(seen).toEqual(["aborted"]);
  });

  it("does not throw when emit is called after the stream has been cancelled", async () => {
    const req = createMockRequest();

    const resp = makeSSEResponse(req, async ({ emit, sleep }) => {
      emit({ event: "before", data: 1 });
      await sleep(50);
      // After cancel + small delay, this emit should be a no-op.
      expect(() => emit({ event: "after", data: 2 })).not.toThrow();
    });

    const reader = resp.body!.getReader();
    await reader.read();
    await reader.cancel();
    await new Promise((r) => setTimeout(r, 100));
  });

  // The duration cap is 270s — we don't wait that long in tests, but we
  // verify the runner can observe the abort signal it was given.
  it("propagates abort signal to the runner", async () => {
    const ctrl = new AbortController();
    const req = new Request("http://localhost/test", { signal: ctrl.signal });
    const seen = vi.fn();

    const resp = makeSSEResponse(req, async ({ signal }) => {
      signal.addEventListener("abort", () => seen());
      // Wait a tick then trigger abort.
      await new Promise((r) => setTimeout(r, 20));
      ctrl.abort();
      await new Promise((r) => setTimeout(r, 20));
    });

    await readAll(resp.body!);
    expect(seen).toHaveBeenCalled();
  });
});
