import { describe, it, expect, vi, beforeEach } from "vitest";
import { StrawClient } from "./client";
import { StrawApiError } from "./errors";

// ── Mock fetch ──────────────────────────────────────────────

function mockFetchResponse(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockFetch204() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 204,
    json: () => Promise.resolve(undefined),
  });
}

describe("StrawClient", () => {
  let client: StrawClient;

  beforeEach(() => {
    client = new StrawClient({
      apiKey: "straw_sk_test123",
      baseUrl: "http://localhost:3000",
    });
  });

  describe("tasks", () => {
    it("lists open tasks", async () => {
      const responseData = {
        data: [{ id: "t1", title: "Test Task", category: "code-generation" }],
        pagination: { has_more: false, next_cursor: null },
      };
      vi.stubGlobal("fetch", mockFetchResponse(responseData));

      const result = await client.tasks.list({ category: "code-generation" });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("t1");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/tasks?category=code-generation"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer straw_sk_test123",
          }),
        })
      );
    });

    it("gets task detail", async () => {
      const responseData = {
        id: "t1",
        title: "Build an API",
        criteria: [{ name: "Correctness", description: "Does it work?" }],
        quota: { used: 0, limit: 5, remaining: 5 },
      };
      vi.stubGlobal("fetch", mockFetchResponse(responseData));

      const result = await client.tasks.get("t1");

      expect(result.criteria).toHaveLength(1);
      expect(result.criteria[0].name).toBe("Correctness");
      expect(result.quota?.remaining).toBe(5);
    });
  });

  describe("submissions", () => {
    it("creates upload submission", async () => {
      const responseData = {
        id: "s1",
        task_id: "t1",
        status: "registered",
        mode: "upload",
        quota: { used: 1, limit: 5, remaining: 4 },
        upload_url: "https://storage.example.com/signed",
        upload_expires_at: "2026-04-13T00:00:00Z",
      };
      vi.stubGlobal("fetch", mockFetchResponse(responseData, 201));

      const result = await client.submissions.create("t1", { mode: "upload" });

      expect(result.status).toBe("registered");
      expect(result.upload_url).toBeTruthy();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/tasks/t1/submissions"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("lists submissions", async () => {
      const responseData = {
        data: [{ id: "s1", status: "completed", mode: "upload" }],
        pagination: { has_more: false, next_cursor: null },
      };
      vi.stubGlobal("fetch", mockFetchResponse(responseData));

      const result = await client.submissions.list({ task_id: "t1" });

      expect(result.data).toHaveLength(1);
    });

    it("gets submission with scores", async () => {
      const responseData = {
        id: "s1",
        status: "completed",
        evaluated: true,
        scores: { final_score: 85, test_score: null, llm_score: 85 },
        dimensions: [
          { criterion_name: "Correctness", score: 90, reasoning: "Good work." },
        ],
        position: 2,
        quota: { used: 1, limit: 5, remaining: 4 },
      };
      vi.stubGlobal("fetch", mockFetchResponse(responseData));

      const result = await client.submissions.get("s1");

      expect(result.evaluated).toBe(true);
      expect(result.scores?.final_score).toBe(85);
      expect(result.dimensions[0].criterion_name).toBe("Correctness");
      expect(result.position).toBe(2);
    });

    it("uploads artifact", async () => {
      const responseData = {
        id: "s1",
        status: "completed",
        output_url: "submissions/s1",
        message: "Upload received, evaluation queued",
      };
      vi.stubGlobal("fetch", mockFetchResponse(responseData, 202));

      const result = await client.submissions.upload("s1", Buffer.from("test output"));

      expect(result.message).toContain("evaluation queued");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/submissions/s1/upload"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/octet-stream",
          }),
        })
      );
    });

    it("signals completion", async () => {
      const responseData = {
        id: "s1",
        status: "completed",
        output_url: "submissions/s1",
        message: "Upload verified, evaluation queued",
      };
      vi.stubGlobal("fetch", mockFetchResponse(responseData, 202));

      const result = await client.submissions.complete("s1");

      expect(result.message).toContain("evaluation queued");
    });
  });

  describe("webhooks", () => {
    it("creates webhook with secret", async () => {
      const responseData = {
        id: "wh1",
        url: "https://my-agent.com/webhook",
        events: ["task.matched"],
        active: true,
        secret: "hex_secret_value",
        created_at: "2026-04-12T00:00:00Z",
      };
      vi.stubGlobal("fetch", mockFetchResponse(responseData, 201));

      const result = await client.webhooks.create({
        url: "https://my-agent.com/webhook",
        events: ["task.matched"],
      });

      expect(result.secret).toBeTruthy();
      expect(result.events).toContain("task.matched");
    });

    it("lists webhooks", async () => {
      const responseData = {
        data: [{ id: "wh1", url: "https://example.com", events: ["task.matched"], active: true }],
      };
      vi.stubGlobal("fetch", mockFetchResponse(responseData));

      const result = await client.webhooks.list();

      expect(result.data).toHaveLength(1);
    });

    it("deletes webhook", async () => {
      vi.stubGlobal("fetch", mockFetch204());

      await client.webhooks.delete("wh1");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/webhooks/wh1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("sends test webhook", async () => {
      const responseData = { delivery_id: "d1", message: "Test webhook queued" };
      vi.stubGlobal("fetch", mockFetchResponse(responseData, 202));

      const result = await client.webhooks.test("wh1");

      expect(result.delivery_id).toBe("d1");
    });
  });

  describe("error handling", () => {
    it("throws StrawApiError on 401", async () => {
      vi.stubGlobal("fetch", mockFetchResponse(
        { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        401
      ));

      await expect(client.tasks.list()).rejects.toThrow(StrawApiError);
      await expect(client.tasks.list()).rejects.toMatchObject({
        status: 401,
        code: "UNAUTHORIZED",
      });
    });

    it("throws StrawApiError on 429 with details", async () => {
      vi.stubGlobal("fetch", mockFetchResponse(
        {
          error: {
            message: "Quota exhausted",
            code: "QUOTA_EXHAUSTED",
            details: { used: 5, limit: 5, remaining: 0 },
          },
        },
        429
      ));

      try {
        await client.submissions.create("t1", { mode: "upload" });
      } catch (err) {
        expect(err).toBeInstanceOf(StrawApiError);
        const apiErr = err as StrawApiError;
        expect(apiErr.status).toBe(429);
        expect(apiErr.code).toBe("QUOTA_EXHAUSTED");
        expect(apiErr.details).toEqual({ used: 5, limit: 5, remaining: 0 });
      }
    });
  });

  describe("baseUrl validation (protects against API-key exfiltration)", () => {
    it("accepts https URLs", () => {
      expect(() =>
        new StrawClient({ apiKey: "straw_sk_x", baseUrl: "https://straw.wiki" })
      ).not.toThrow();
    });

    it("accepts http://localhost for local dev", () => {
      expect(() =>
        new StrawClient({ apiKey: "straw_sk_x", baseUrl: "http://localhost:3000" })
      ).not.toThrow();
      expect(() =>
        new StrawClient({ apiKey: "straw_sk_x", baseUrl: "http://127.0.0.1:3000" })
      ).not.toThrow();
      expect(() =>
        new StrawClient({ apiKey: "straw_sk_x", baseUrl: "http://[::1]:3000" })
      ).not.toThrow();
    });

    it("rejects http:// to a non-loopback host", () => {
      expect(() =>
        new StrawClient({ apiKey: "straw_sk_x", baseUrl: "http://attacker.com" })
      ).toThrow(/https/i);
      expect(() =>
        new StrawClient({ apiKey: "straw_sk_x", baseUrl: "http://example.com" })
      ).toThrow(/https/i);
    });

    it("rejects non-http(s) schemes", () => {
      expect(() =>
        new StrawClient({ apiKey: "straw_sk_x", baseUrl: "javascript:fetch('//x')" })
      ).toThrow();
      expect(() =>
        new StrawClient({ apiKey: "straw_sk_x", baseUrl: "file:///etc/passwd" })
      ).toThrow();
      expect(() =>
        new StrawClient({ apiKey: "straw_sk_x", baseUrl: "ftp://attacker.com" })
      ).toThrow();
    });

    it("rejects malformed URLs", () => {
      expect(() =>
        new StrawClient({ apiKey: "straw_sk_x", baseUrl: "not a url" })
      ).toThrow();
      expect(() =>
        new StrawClient({ apiKey: "straw_sk_x", baseUrl: "" })
      ).toThrow();
    });

    it("uses the https default when baseUrl is omitted", () => {
      expect(() => new StrawClient({ apiKey: "straw_sk_x" })).not.toThrow();
    });
  });
});
