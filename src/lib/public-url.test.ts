import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isBlockedIp,
  validatePublicUrlSync,
  validatePublicUrlDynamic,
} from "./public-url";

describe("isBlockedIp", () => {
  it("blocks loopback IPv4", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("127.255.255.254")).toBe(true);
  });

  it("blocks RFC1918 private ranges", () => {
    expect(isBlockedIp("10.0.0.1")).toBe(true);
    expect(isBlockedIp("172.16.5.5")).toBe(true);
    expect(isBlockedIp("172.31.255.255")).toBe(true);
    expect(isBlockedIp("192.168.1.1")).toBe(true);
  });

  it("allows 172.32.x.x (outside 172.16.0.0/12)", () => {
    expect(isBlockedIp("172.32.0.1")).toBe(false);
  });

  it("blocks link-local 169.254.x.x (cloud metadata)", () => {
    expect(isBlockedIp("169.254.169.254")).toBe(true);
    expect(isBlockedIp("169.254.0.1")).toBe(true);
  });

  it("blocks CGNAT 100.64-127.x.x", () => {
    expect(isBlockedIp("100.64.0.1")).toBe(true);
    expect(isBlockedIp("100.127.255.254")).toBe(true);
    expect(isBlockedIp("100.63.0.1")).toBe(false); // just outside
    expect(isBlockedIp("100.128.0.1")).toBe(false); // just outside
  });

  it("blocks 0.0.0.0/8", () => {
    expect(isBlockedIp("0.0.0.0")).toBe(true);
    expect(isBlockedIp("0.1.2.3")).toBe(true);
  });

  it("blocks multicast and reserved", () => {
    expect(isBlockedIp("224.0.0.1")).toBe(true);
    expect(isBlockedIp("239.255.255.255")).toBe(true);
    expect(isBlockedIp("240.0.0.0")).toBe(true);
    expect(isBlockedIp("255.255.255.255")).toBe(true);
  });

  it("blocks TEST-NET documentation ranges", () => {
    expect(isBlockedIp("192.0.2.1")).toBe(true);
    expect(isBlockedIp("198.51.100.1")).toBe(true);
    expect(isBlockedIp("203.0.113.1")).toBe(true);
    expect(isBlockedIp("198.18.0.1")).toBe(true);
  });

  it("allows normal public IPv4", () => {
    expect(isBlockedIp("1.1.1.1")).toBe(false);
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("104.18.28.69")).toBe(false);
  });

  it("blocks IPv6 loopback and any", () => {
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("::")).toBe(true);
  });

  it("blocks IPv6 link-local fe80::/10 and unique-local fc00::/7", () => {
    expect(isBlockedIp("fe80::1")).toBe(true);
    expect(isBlockedIp("fc00::1")).toBe(true);
    expect(isBlockedIp("fd12:3456:789a::1")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 pointing at private addresses", () => {
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedIp("::ffff:169.254.169.254")).toBe(true);
    expect(isBlockedIp("::ffff:8.8.8.8")).toBe(false);
  });

  it("returns false for non-IP strings", () => {
    expect(isBlockedIp("not-an-ip")).toBe(false);
    expect(isBlockedIp("example.com")).toBe(false);
  });
});

describe("validatePublicUrlSync", () => {
  it("accepts plain https URLs", () => {
    expect(validatePublicUrlSync("https://example.com/hook")).toEqual({ ok: true });
    expect(validatePublicUrlSync("https://api.example.com:8443/x")).toEqual({ ok: true });
  });

  it("rejects http://", () => {
    const r = validatePublicUrlSync("http://example.com/");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/https/i);
  });

  it("rejects malformed URLs", () => {
    expect(validatePublicUrlSync("not a url").ok).toBe(false);
    expect(validatePublicUrlSync("").ok).toBe(false);
  });

  it("rejects IP literals in private ranges", () => {
    expect(validatePublicUrlSync("https://127.0.0.1/hook").ok).toBe(false);
    expect(validatePublicUrlSync("https://169.254.169.254/metadata").ok).toBe(false);
    expect(validatePublicUrlSync("https://10.0.0.1/x").ok).toBe(false);
    expect(validatePublicUrlSync("https://192.168.1.1/x").ok).toBe(false);
  });

  it("accepts IP literal in a public range", () => {
    expect(validatePublicUrlSync("https://1.1.1.1/x")).toEqual({ ok: true });
  });

  it("rejects IPv6 loopback literal", () => {
    expect(validatePublicUrlSync("https://[::1]/hook").ok).toBe(false);
  });

  it("rejects hostnames that look obviously internal", () => {
    expect(validatePublicUrlSync("https://localhost/hook").ok).toBe(false);
    expect(validatePublicUrlSync("https://db.local/hook").ok).toBe(false);
    expect(validatePublicUrlSync("https://app.internal/hook").ok).toBe(false);
    expect(validatePublicUrlSync("https://server.corp/hook").ok).toBe(false);
    expect(validatePublicUrlSync("https://nas.home/hook").ok).toBe(false);
  });

  it("accepts public hostnames", () => {
    expect(validatePublicUrlSync("https://hooks.example.com/in").ok).toBe(true);
    expect(validatePublicUrlSync("https://api.company.co/webhooks").ok).toBe(true);
  });

  it("is case-insensitive for hostnames", () => {
    expect(validatePublicUrlSync("https://LOCALHOST/x").ok).toBe(false);
    expect(validatePublicUrlSync("https://DB.LOCAL/x").ok).toBe(false);
  });
});

describe("validatePublicUrlDynamic", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makeLookup =
    (addrs: Array<{ address: string; family: number }>) =>
    async () =>
      addrs;

  it("returns the static result immediately for obvious failures", async () => {
    const r = await validatePublicUrlDynamic(
      "http://example.com/",
      makeLookup([{ address: "1.1.1.1", family: 4 }])
    );
    expect(r.ok).toBe(false);
  });

  it("passes through when host is a public IP literal (no DNS call)", async () => {
    const r = await validatePublicUrlDynamic("https://8.8.8.8/x");
    expect(r.ok).toBe(true);
  });

  it("rejects when DNS resolves to a private IP (rebind mitigation)", async () => {
    const r = await validatePublicUrlDynamic(
      "https://evil-rebind.example/x",
      makeLookup([{ address: "127.0.0.1", family: 4 }])
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/127\.0\.0\.1/);
  });

  it("rejects when any resolved address is blocked (poisoned set)", async () => {
    const r = await validatePublicUrlDynamic(
      "https://mixed.example/x",
      makeLookup([
        { address: "1.1.1.1", family: 4 },
        { address: "169.254.169.254", family: 4 },
      ])
    );
    expect(r.ok).toBe(false);
  });

  it("accepts when all resolved addresses are public", async () => {
    const r = await validatePublicUrlDynamic(
      "https://good.example/x",
      makeLookup([
        { address: "1.1.1.1", family: 4 },
        { address: "2606:4700:4700::1111", family: 6 },
      ])
    );
    expect(r.ok).toBe(true);
  });

  it("rejects when DNS throws", async () => {
    const lookup = async () => {
      throw new Error("NXDOMAIN");
    };
    const r = await validatePublicUrlDynamic("https://nonexistent.example/x", lookup);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/NXDOMAIN/);
  });

  it("rejects when DNS returns an empty set", async () => {
    const r = await validatePublicUrlDynamic(
      "https://empty.example/x",
      makeLookup([])
    );
    expect(r.ok).toBe(false);
  });
});
