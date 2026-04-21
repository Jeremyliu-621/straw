/**
 * Tests for the webhook registration Zod schema.
 *
 * The schema itself is defined inside the route file as a module-local
 * constant, so we re-derive the same shape here using the public
 * validators it depends on. This ensures the SSRF allowlist is
 * enforced on the create path — agents can't register webhooks
 * pointing at localhost, cloud metadata, or RFC1918 ranges.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import { WEBHOOK_EVENT } from "@/constants";
import { validatePublicUrlSync } from "@/lib/public-url";

const eventValues = Object.values(WEBHOOK_EVENT) as [string, ...string[]];

const schema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .superRefine((u, ctx) => {
      const r = validatePublicUrlSync(u);
      if (!r.ok) ctx.addIssue({ code: "custom", message: r.reason });
    }),
  events: z.array(z.enum(eventValues)).min(1),
});

describe("webhook create schema — SSRF allowlist", () => {
  it("accepts a plain https webhook URL", () => {
    const parsed = schema.safeParse({
      url: "https://hooks.example.com/endpoint",
      events: ["evaluation.completed"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects http://", () => {
    const r = schema.safeParse({ url: "http://hooks.example.com/", events: ["evaluation.completed"] });
    expect(r.success).toBe(false);
  });

  it("rejects localhost", () => {
    const r = schema.safeParse({ url: "https://localhost/x", events: ["evaluation.completed"] });
    expect(r.success).toBe(false);
  });

  it("rejects 127.0.0.1", () => {
    const r = schema.safeParse({ url: "https://127.0.0.1/x", events: ["evaluation.completed"] });
    expect(r.success).toBe(false);
  });

  it("rejects AWS metadata IP", () => {
    const r = schema.safeParse({
      url: "https://169.254.169.254/latest/meta-data/",
      events: ["evaluation.completed"],
    });
    expect(r.success).toBe(false);
  });

  it("rejects RFC1918 private ranges", () => {
    for (const host of ["10.0.0.1", "172.16.0.1", "192.168.1.1"]) {
      const r = schema.safeParse({
        url: `https://${host}/x`,
        events: ["evaluation.completed"],
      });
      expect(r.success).toBe(false);
    }
  });

  it("rejects .local / .internal / .corp hostnames", () => {
    for (const host of ["db.local", "api.internal", "server.corp"]) {
      const r = schema.safeParse({
        url: `https://${host}/x`,
        events: ["evaluation.completed"],
      });
      expect(r.success).toBe(false);
    }
  });

  it("rejects IPv6 loopback literal", () => {
    const r = schema.safeParse({
      url: "https://[::1]/x",
      events: ["evaluation.completed"],
    });
    expect(r.success).toBe(false);
  });

  it("requires at least one event", () => {
    const r = schema.safeParse({ url: "https://hooks.example.com/x", events: [] });
    expect(r.success).toBe(false);
  });
});
