import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { assertDevEndpointEnabled } from "./dev-gate";

describe("assertDevEndpointEnabled", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowDev = process.env.ALLOW_DEV_ENDPOINTS;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAllowDev === undefined) {
      delete process.env.ALLOW_DEV_ENDPOINTS;
    } else {
      process.env.ALLOW_DEV_ENDPOINTS = originalAllowDev;
    }
  });

  it("returns null (allowed) when both gates are open", () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_DEV_ENDPOINTS = "true";
    expect(assertDevEndpointEnabled()).toBeNull();
  });

  it("returns 403 when NODE_ENV=development but ALLOW_DEV_ENDPOINTS is unset", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_DEV_ENDPOINTS;
    const resp = assertDevEndpointEnabled();
    expect(resp).not.toBeNull();
    expect(resp?.status).toBe(403);
  });

  it("returns 403 when NODE_ENV=development but ALLOW_DEV_ENDPOINTS=false", () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_DEV_ENDPOINTS = "false";
    const resp = assertDevEndpointEnabled();
    expect(resp?.status).toBe(403);
  });

  it("returns 403 when ALLOW_DEV_ENDPOINTS=true but NODE_ENV=production", () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DEV_ENDPOINTS = "true";
    const resp = assertDevEndpointEnabled();
    expect(resp?.status).toBe(403);
  });

  it("returns 403 in test env even with ALLOW_DEV_ENDPOINTS=true", () => {
    process.env.NODE_ENV = "test";
    process.env.ALLOW_DEV_ENDPOINTS = "true";
    const resp = assertDevEndpointEnabled();
    expect(resp?.status).toBe(403);
  });

  it("rejects common truthy look-alikes for ALLOW_DEV_ENDPOINTS", () => {
    process.env.NODE_ENV = "development";
    for (const v of ["1", "yes", "TRUE", "True", " true "]) {
      process.env.ALLOW_DEV_ENDPOINTS = v;
      expect(assertDevEndpointEnabled()?.status).toBe(403);
    }
  });
});
