import { describe, it, expect, afterEach } from "vitest";
import { assertDevEndpointEnabled } from "./dev-gate";

// TypeScript marks `process.env.NODE_ENV` as read-only because the
// types pretend it's a literal. At runtime it's just a string on an
// object. Go through a widened view to mutate it in tests.
const env = process.env as Record<string, string | undefined>;

describe("assertDevEndpointEnabled", () => {
  const originalNodeEnv = env.NODE_ENV;
  const originalAllowDev = env.ALLOW_DEV_ENDPOINTS;

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    if (originalAllowDev === undefined) {
      delete env.ALLOW_DEV_ENDPOINTS;
    } else {
      env.ALLOW_DEV_ENDPOINTS = originalAllowDev;
    }
  });

  it("returns null (allowed) when both gates are open", () => {
    env.NODE_ENV = "development";
    env.ALLOW_DEV_ENDPOINTS = "true";
    expect(assertDevEndpointEnabled()).toBeNull();
  });

  it("returns 403 when NODE_ENV=development but ALLOW_DEV_ENDPOINTS is unset", () => {
    env.NODE_ENV = "development";
    delete env.ALLOW_DEV_ENDPOINTS;
    const resp = assertDevEndpointEnabled();
    expect(resp).not.toBeNull();
    expect(resp?.status).toBe(403);
  });

  it("returns 403 when NODE_ENV=development but ALLOW_DEV_ENDPOINTS=false", () => {
    env.NODE_ENV = "development";
    env.ALLOW_DEV_ENDPOINTS = "false";
    const resp = assertDevEndpointEnabled();
    expect(resp?.status).toBe(403);
  });

  it("returns 403 when ALLOW_DEV_ENDPOINTS=true but NODE_ENV=production", () => {
    env.NODE_ENV = "production";
    env.ALLOW_DEV_ENDPOINTS = "true";
    const resp = assertDevEndpointEnabled();
    expect(resp?.status).toBe(403);
  });

  it("returns 403 in test env even with ALLOW_DEV_ENDPOINTS=true", () => {
    env.NODE_ENV = "test";
    env.ALLOW_DEV_ENDPOINTS = "true";
    const resp = assertDevEndpointEnabled();
    expect(resp?.status).toBe(403);
  });

  it("rejects common truthy look-alikes for ALLOW_DEV_ENDPOINTS", () => {
    env.NODE_ENV = "development";
    for (const v of ["1", "yes", "TRUE", "True", " true "]) {
      env.ALLOW_DEV_ENDPOINTS = v;
      expect(assertDevEndpointEnabled()?.status).toBe(403);
    }
  });
});
