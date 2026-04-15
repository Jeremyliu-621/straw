import { describe, it, expect } from "vitest";
import { validateUuid, parsePagination, apiError, parseBody, paginatedResponse } from "@/lib/api-utils";

describe("validateUuid", () => {
  it("returns null for valid UUID v4", () => {
    expect(validateUuid("550e8400-e29b-41d4-a716-446655440000")).toBeNull();
  });

  it("returns null for uppercase UUID", () => {
    expect(validateUuid("550E8400-E29B-41D4-A716-446655440000")).toBeNull();
  });

  it("returns error response for empty string", () => {
    const result = validateUuid("");
    expect(result).not.toBeNull();
    expect(result?.status).toBe(400);
  });

  it("returns error response for non-UUID string", () => {
    const result = validateUuid("not-a-uuid");
    expect(result).not.toBeNull();
  });

  it("returns error response for UUID missing a section", () => {
    const result = validateUuid("550e8400-e29b-41d4-a716");
    expect(result).not.toBeNull();
  });

  it("uses custom label in error message", async () => {
    const result = validateUuid("bad", "task ID");
    expect(result).not.toBeNull();
    const body = await result!.json();
    expect(body.error.message).toContain("task ID");
  });

  it("returns error for string with spaces", () => {
    expect(validateUuid("550e8400 e29b 41d4 a716 446655440000")).not.toBeNull();
  });
});

describe("parsePagination", () => {
  it("returns default limit of 20 when not specified", () => {
    const url = new URL("http://localhost/api?foo=bar");
    const { limit, cursor } = parsePagination(url);

    expect(limit).toBe(20);
    expect(cursor).toBeNull();
  });

  it("respects custom limit", () => {
    const url = new URL("http://localhost/api?limit=50");
    const { limit } = parsePagination(url);

    expect(limit).toBe(50);
  });

  it("caps limit at 100", () => {
    const url = new URL("http://localhost/api?limit=500");
    const { limit } = parsePagination(url);

    expect(limit).toBe(100);
  });

  it("enforces minimum limit of 1", () => {
    const url = new URL("http://localhost/api?limit=0");
    const { limit } = parsePagination(url);

    expect(limit).toBe(1);
  });

  it("handles non-numeric limit gracefully", () => {
    const url = new URL("http://localhost/api?limit=abc");
    const { limit } = parsePagination(url);

    expect(limit).toBe(20);
  });

  it("parses cursor parameter", () => {
    const url = new URL("http://localhost/api?cursor=2024-01-01T00:00:00Z");
    const { cursor } = parsePagination(url);

    expect(cursor).toBe("2024-01-01T00:00:00Z");
  });

  it("returns null cursor when not provided", () => {
    const url = new URL("http://localhost/api");
    const { cursor } = parsePagination(url);

    expect(cursor).toBeNull();
  });

  it("handles negative limit", () => {
    const url = new URL("http://localhost/api?limit=-5");
    const { limit } = parsePagination(url);

    expect(limit).toBe(1);
  });
});

describe("apiError", () => {
  it("returns JSON response with error object", async () => {
    const response = apiError("Not found", 404);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toBe("Not found");
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("uses custom error code when provided", async () => {
    const response = apiError("Bad request", 400, "VALIDATION_ERROR");
    const body = await response.json();

    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("includes details when provided", async () => {
    const response = apiError("Bad", 400, "VALIDATION_ERROR", "field X is required");
    const body = await response.json();

    expect(body.error.details).toBe("field X is required");
  });

  it("omits details when not provided", async () => {
    const response = apiError("Error", 500);
    const body = await response.json();

    expect(body.error).not.toHaveProperty("details");
  });

  it("maps status codes to standard codes", async () => {
    const cases: Array<[number, string]> = [
      [400, "BAD_REQUEST"],
      [401, "UNAUTHORIZED"],
      [403, "FORBIDDEN"],
      [404, "NOT_FOUND"],
      [409, "CONFLICT"],
      [429, "RATE_LIMITED"],
      [500, "INTERNAL_ERROR"],
    ];

    for (const [status, expectedCode] of cases) {
      const response = apiError("test", status);
      const body = await response.json();
      expect(body.error.code).toBe(expectedCode);
    }
  });
});

describe("parseBody", () => {
  it("parses valid JSON body", async () => {
    const req = new Request("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ foo: "bar" }),
      headers: { "Content-Type": "application/json" },
    });

    const result = await parseBody(req);
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data).toEqual({ foo: "bar" });
    }
  });

  it("returns error for invalid JSON", async () => {
    const req = new Request("http://localhost/api", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    const result = await parseBody(req);
    expect("error" in result).toBe(true);
  });

  it("returns error for empty body", async () => {
    const req = new Request("http://localhost/api", {
      method: "POST",
    });

    const result = await parseBody(req);
    expect("error" in result).toBe(true);
  });
});

describe("paginatedResponse", () => {
  it("sets has_more false when items <= limit", async () => {
    const items = [
      { id: "1", created_at: "2024-01-01T00:00:00Z" },
      { id: "2", created_at: "2024-01-02T00:00:00Z" },
    ];

    const response = paginatedResponse(items, 20);
    const body = await response.json();

    expect(body.pagination.has_more).toBe(false);
    expect(body.pagination.next_cursor).toBeNull();
    expect(body.data.length).toBe(2);
  });

  it("sets has_more true and provides cursor when items > limit", async () => {
    const items = [
      { id: "1", created_at: "2024-01-01T00:00:00Z" },
      { id: "2", created_at: "2024-01-02T00:00:00Z" },
      { id: "3", created_at: "2024-01-03T00:00:00Z" },
    ];

    const response = paginatedResponse(items, 2);
    const body = await response.json();

    expect(body.pagination.has_more).toBe(true);
    expect(body.data.length).toBe(2);
    expect(body.pagination.next_cursor).toBe("2024-01-02T00:00:00Z");
  });

  it("handles empty array", async () => {
    const response = paginatedResponse([], 20);
    const body = await response.json();

    expect(body.data).toEqual([]);
    expect(body.pagination.has_more).toBe(false);
    expect(body.pagination.next_cursor).toBeNull();
  });
});
