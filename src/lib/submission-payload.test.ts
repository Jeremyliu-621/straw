import { describe, it, expect } from "vitest";
import { validateSubmissionPayload, __testing__ } from "./submission-payload";
import { SUBMISSION_KIND } from "@/constants";

const { isSafePublicUrl } = __testing__;

describe("isSafePublicUrl (SSRF guard)", () => {
  it("accepts public https URLs", () => {
    expect(isSafePublicUrl("https://github.com/foo/bar")).toBe(true);
    expect(isSafePublicUrl("https://api.example.com:8443/v1")).toBe(true);
    expect(isSafePublicUrl("https://example.co.uk/path")).toBe(true);
  });

  it("rejects http:// by default", () => {
    expect(isSafePublicUrl("http://example.com")).toBe(false);
  });

  it("rejects non-{http,https} schemes", () => {
    expect(isSafePublicUrl("file:///etc/passwd")).toBe(false);
    expect(isSafePublicUrl("ftp://example.com")).toBe(false);
    expect(isSafePublicUrl("git://example.com/repo")).toBe(false);
    expect(isSafePublicUrl("gopher://example.com")).toBe(false);
    expect(isSafePublicUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects loopback hostnames", () => {
    expect(isSafePublicUrl("https://localhost/x")).toBe(false);
    expect(isSafePublicUrl("https://127.0.0.1/x")).toBe(false);
    expect(isSafePublicUrl("https://0.0.0.0/x")).toBe(false);
    expect(isSafePublicUrl("https://[::1]/x")).toBe(false);
  });

  it("rejects RFC1918 private space", () => {
    expect(isSafePublicUrl("https://10.0.0.1/x")).toBe(false);
    expect(isSafePublicUrl("https://192.168.1.1/x")).toBe(false);
    expect(isSafePublicUrl("https://172.16.0.1/x")).toBe(false);
    expect(isSafePublicUrl("https://172.31.255.255/x")).toBe(false);
  });

  it("does NOT reject 172.x.x.x outside the private range", () => {
    expect(isSafePublicUrl("https://172.32.0.1/x")).toBe(true);
    expect(isSafePublicUrl("https://172.15.0.1/x")).toBe(true);
  });

  it("rejects link-local and IPv6 ULA", () => {
    expect(isSafePublicUrl("https://169.254.1.1/x")).toBe(false);
    expect(isSafePublicUrl("https://[fe80::1]/x")).toBe(false);
    expect(isSafePublicUrl("https://[fc00::1]/x")).toBe(false);
    expect(isSafePublicUrl("https://[fd00::1]/x")).toBe(false);
  });

  it("rejects cloud metadata endpoints", () => {
    expect(isSafePublicUrl("https://169.254.169.254/latest")).toBe(false);
    expect(isSafePublicUrl("https://metadata.google.internal/x")).toBe(false);
    expect(isSafePublicUrl("https://metadata.azure.com/x")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isSafePublicUrl("not a url")).toBe(false);
    expect(isSafePublicUrl("")).toBe(false);
    expect(isSafePublicUrl("https://")).toBe(false);
  });
});

describe("validateSubmissionPayload — zip", () => {
  it("accepts null payload (artifact lives in Storage)", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.ZIP, null);
    expect(r.valid).toBe(true);
  });

  it("accepts undefined payload", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.ZIP, undefined);
    expect(r.valid).toBe(true);
  });

  it("accepts empty object payload", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.ZIP, {});
    expect(r.valid).toBe(true);
  });

  it("rejects non-empty object payload", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.ZIP, { foo: "bar" });
    expect(r.valid).toBe(false);
  });
});

describe("validateSubmissionPayload — repo_url", () => {
  it("accepts a public github URL", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.REPO_URL, {
      url: "https://github.com/Jeremyliu-621/mop",
    });
    expect(r.valid).toBe(true);
  });

  it("accepts an optional ref + subpath", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.REPO_URL, {
      url: "https://github.com/Jeremyliu-621/mop",
      ref: "feat/collab-philosophy",
      subpath: "packages/agent-sdk",
    });
    expect(r.valid).toBe(true);
  });

  it("rejects http:// repo URL", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.REPO_URL, {
      url: "http://github.com/foo/bar",
    });
    expect(r.valid).toBe(false);
  });

  it("rejects subpath with leading slash", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.REPO_URL, {
      url: "https://github.com/foo/bar",
      subpath: "/etc/passwd",
    });
    expect(r.valid).toBe(false);
  });

  it("rejects subpath with parent traversal", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.REPO_URL, {
      url: "https://github.com/foo/bar",
      subpath: "src/../../etc",
    });
    expect(r.valid).toBe(false);
  });

  it("rejects missing url", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.REPO_URL, {});
    expect(r.valid).toBe(false);
  });
});

describe("validateSubmissionPayload — live_endpoint", () => {
  it("accepts an https URL", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.LIVE_ENDPOINT, {
      url: "https://my-agent.fly.dev",
    });
    expect(r.valid).toBe(true);
  });

  it("accepts optional health_path + auth_header + notes", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.LIVE_ENDPOINT, {
      url: "https://my-agent.example.com",
      health_path: "/health",
      auth_header: "Bearer agent_xyz",
      notes: "Rate limit 10 req/s; please pace probes.",
    });
    expect(r.valid).toBe(true);
  });

  it("rejects health_path without leading slash", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.LIVE_ENDPOINT, {
      url: "https://my-agent.example.com",
      health_path: "health",
    });
    expect(r.valid).toBe(false);
  });

  it("rejects internal IP space", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.LIVE_ENDPOINT, {
      url: "https://10.0.0.5",
    });
    expect(r.valid).toBe(false);
  });
});

describe("validateSubmissionPayload — dockerfile", () => {
  it("accepts a small Dockerfile", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.DOCKERFILE, {
      dockerfile: "FROM node:24-alpine\nCOPY . /app\nWORKDIR /app\nRUN npm ci\nCMD [\"node\", \"index.js\"]\n",
    });
    expect(r.valid).toBe(true);
  });

  it("rejects empty dockerfile", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.DOCKERFILE, { dockerfile: "" });
    expect(r.valid).toBe(false);
  });

  it("rejects oversize dockerfile", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.DOCKERFILE, {
      dockerfile: "FROM scratch\n" + "X".repeat(70 * 1024),
    });
    expect(r.valid).toBe(false);
  });

  it("accepts optional context_files + build_args", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.DOCKERFILE, {
      dockerfile: "FROM node:24\nCOPY app.js .",
      context_files: { "app.js": "console.log('hi')" },
      build_args: { NODE_ENV: "production" },
    });
    expect(r.valid).toBe(true);
  });
});

describe("validateSubmissionPayload — mixed", () => {
  it("accepts a heterogeneous mixed payload", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.MIXED, {
      parts: [
        { kind: SUBMISSION_KIND.REPO_URL, payload: { url: "https://github.com/foo/bar" } },
        { kind: SUBMISSION_KIND.LIVE_ENDPOINT, payload: { url: "https://api.example.com" } },
      ],
    });
    expect(r.valid).toBe(true);
  });

  it("rejects nested mixed", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.MIXED, {
      parts: [
        {
          kind: SUBMISSION_KIND.MIXED as never,
          payload: { parts: [{ kind: SUBMISSION_KIND.REPO_URL, payload: { url: "https://github.com/x/y" } }] },
        },
      ],
    });
    expect(r.valid).toBe(false);
  });

  it("rejects a part with an invalid sub-payload", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.MIXED, {
      parts: [
        { kind: SUBMISSION_KIND.LIVE_ENDPOINT, payload: { url: "http://localhost" } },
      ],
    });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/parts\[0\]/);
  });

  it("rejects when only some parts have weights set", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.MIXED, {
      parts: [
        { kind: SUBMISSION_KIND.REPO_URL, payload: { url: "https://github.com/a/b" }, weight: 0.5 },
        { kind: SUBMISSION_KIND.LIVE_ENDPOINT, payload: { url: "https://api.example.com" } },
      ],
    });
    expect(r.valid).toBe(false);
  });

  it("rejects when weights don't sum to 1", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.MIXED, {
      parts: [
        { kind: SUBMISSION_KIND.REPO_URL, payload: { url: "https://github.com/a/b" }, weight: 0.3 },
        { kind: SUBMISSION_KIND.LIVE_ENDPOINT, payload: { url: "https://api.example.com" }, weight: 0.3 },
      ],
    });
    expect(r.valid).toBe(false);
  });

  it("accepts when weights sum to 1", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.MIXED, {
      parts: [
        { kind: SUBMISSION_KIND.REPO_URL, payload: { url: "https://github.com/a/b" }, weight: 0.6 },
        { kind: SUBMISSION_KIND.LIVE_ENDPOINT, payload: { url: "https://api.example.com" }, weight: 0.4 },
      ],
    });
    expect(r.valid).toBe(true);
  });

  it("rejects empty parts array", () => {
    const r = validateSubmissionPayload(SUBMISSION_KIND.MIXED, { parts: [] });
    expect(r.valid).toBe(false);
  });

  it("rejects more than 10 parts", () => {
    const parts = Array.from({ length: 11 }, () => ({
      kind: SUBMISSION_KIND.REPO_URL,
      payload: { url: "https://github.com/x/y" },
    }));
    const r = validateSubmissionPayload(SUBMISSION_KIND.MIXED, { parts });
    expect(r.valid).toBe(false);
  });
});
