/**
 * Tests for buildRedisConnection — the URL parser that decides whether
 * we can even connect to a managed Redis provider. Previously this logic
 * was inlined in 10 sites and silently dropped password + TLS.
 */
import { describe, it, expect } from "vitest";
import { buildRedisConnection } from "./queue";

describe("buildRedisConnection", () => {
  it("parses hostname, port, and password from a basic rediss:// URL", () => {
    const opts = buildRedisConnection(
      "rediss://default:secret123@redis.example.com:6379"
    );
    expect(opts).toMatchObject({
      host: "redis.example.com",
      port: 6379,
      password: "secret123",
      tls: {},
    });
  });

  it("does NOT set tls for redis:// (plain TCP)", () => {
    const opts = buildRedisConnection("redis://localhost:6379") as {
      tls?: unknown;
    };
    expect(opts.tls).toBeUndefined();
  });

  it("sets maxRetriesPerRequest: null (required for BullMQ Workers)", () => {
    const opts = buildRedisConnection("redis://localhost:6379") as {
      maxRetriesPerRequest: number | null;
    };
    expect(opts.maxRetriesPerRequest).toBeNull();
  });

  it("defaults port to 6379 when missing", () => {
    const opts = buildRedisConnection("redis://redis.example.com");
    expect(opts).toMatchObject({ port: 6379 });
  });

  it("decodes URL-encoded password characters", () => {
    const opts = buildRedisConnection(
      "rediss://default:my%2Fpass%40word@redis.example.com:6379"
    ) as { password: string };
    expect(opts.password).toBe("my/pass@word");
  });

  it("omits username when it is the Redis default", () => {
    const opts = buildRedisConnection(
      "rediss://default:pw@redis.example.com:6379"
    ) as { username?: string };
    expect(opts.username).toBeUndefined();
  });

  it("keeps a non-default username", () => {
    const opts = buildRedisConnection(
      "rediss://alice:pw@redis.example.com:6379"
    ) as { username: string };
    expect(opts.username).toBe("alice");
  });

  it("parses the db index from the URL path", () => {
    const opts = buildRedisConnection("redis://localhost:6379/3") as {
      db?: number;
    };
    expect(opts.db).toBe(3);
  });

  it("leaves db unset when path is empty", () => {
    const opts = buildRedisConnection("redis://localhost:6379") as {
      db?: number;
    };
    expect(opts.db).toBeUndefined();
  });

  it("throws if url and process.env.REDIS_URL are both missing", () => {
    const prev = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
      expect(() => buildRedisConnection()).toThrow(/REDIS_URL/);
    } finally {
      if (prev !== undefined) process.env.REDIS_URL = prev;
    }
  });

  it("accepts an Upstash-shaped URL end-to-end", () => {
    const opts = buildRedisConnection(
      "rediss://default:gQAAAAAAAAAAAAAA@smashing-krill-12345.upstash.io:6379"
    );
    expect(opts).toMatchObject({
      host: "smashing-krill-12345.upstash.io",
      port: 6379,
      password: "gQAAAAAAAAAAAAAA",
      tls: {},
      maxRetriesPerRequest: null,
    });
  });
});
