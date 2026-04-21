import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyCronRequest } from "./cron-auth";

describe("verifyCronRequest", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.CRON_SECRET = "s3cr3t-value-1234567890";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CRON_SECRET = originalCronSecret;
  });

  it("accepts a matching Authorization: Bearer header", () => {
    const req = new Request("https://example.com/cron", {
      headers: { Authorization: "Bearer s3cr3t-value-1234567890" },
      method: "POST",
    });
    expect(verifyCronRequest(req)).toBe(true);
  });

  it("accepts a matching x-vercel-cron-signature header", () => {
    const req = new Request("https://example.com/cron", {
      headers: { "x-vercel-cron-signature": "s3cr3t-value-1234567890" },
      method: "POST",
    });
    expect(verifyCronRequest(req)).toBe(true);
  });

  it("rejects a request with no auth headers", () => {
    const req = new Request("https://example.com/cron", { method: "POST" });
    expect(verifyCronRequest(req)).toBe(false);
  });

  it("rejects a wrong bearer secret", () => {
    const req = new Request("https://example.com/cron", {
      headers: { Authorization: "Bearer wrong-value-xxxxxxxxxxx" },
      method: "POST",
    });
    expect(verifyCronRequest(req)).toBe(false);
  });

  it("rejects a bearer prefix without the secret", () => {
    const req = new Request("https://example.com/cron", {
      headers: { Authorization: "Bearer " },
      method: "POST",
    });
    expect(verifyCronRequest(req)).toBe(false);
  });

  it("rejects when CRON_SECRET env var is unset in prod", () => {
    delete process.env.CRON_SECRET;
    const req = new Request("https://example.com/cron", {
      headers: { Authorization: "Bearer anything" },
      method: "POST",
    });
    expect(verifyCronRequest(req)).toBe(false);
  });

  it("accepts any request in dev mode (no secret needed)", () => {
    process.env.NODE_ENV = "development";
    const req = new Request("https://example.com/cron", { method: "POST" });
    expect(verifyCronRequest(req)).toBe(true);
  });

  it("rejects a secret that is the right length but wrong content", () => {
    // Same length as "s3cr3t-value-1234567890" (22 chars) but different bytes.
    const req = new Request("https://example.com/cron", {
      headers: { "x-vercel-cron-signature": "AAAAAAAAAAAAAAAAAAAAA1" },
      method: "POST",
    });
    expect(verifyCronRequest(req)).toBe(false);
  });

  it("rejects when headers are present but secret is empty string", () => {
    process.env.CRON_SECRET = "";
    const req = new Request("https://example.com/cron", {
      headers: { Authorization: "Bearer " },
      method: "POST",
    });
    expect(verifyCronRequest(req)).toBe(false);
  });
});
