import { describe, it, expect } from "vitest";
import { safeExternalUrl, safeUrlOnHosts } from "./safe-external-url";

describe("safeExternalUrl", () => {
  it("accepts plain https URLs", () => {
    expect(safeExternalUrl("https://github.com/user")).toBe("https://github.com/user");
    expect(safeExternalUrl("http://example.com/")).toBe("http://example.com/");
  });

  it("rejects javascript: URLs (XSS)", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("JavaScript:alert(1)")).toBeNull();
    expect(safeExternalUrl("JAVASCRIPT:alert(document.cookie)")).toBeNull();
  });

  it("rejects data: URLs", () => {
    expect(safeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalUrl("data:application/json,{}")).toBeNull();
  });

  it("rejects vbscript: URLs", () => {
    expect(safeExternalUrl("vbscript:alert(1)")).toBeNull();
  });

  it("rejects file:// URLs", () => {
    expect(safeExternalUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects obviously-malformed input", () => {
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl("   ")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    // @ts-expect-error runtime guard
    expect(safeExternalUrl(42)).toBeNull();
  });

  it("rejects URLs that try to smuggle schemes via leading whitespace", () => {
    // Browsers trim leading whitespace, so attackers pad with it.
    // trim() on our side normalises away the trick.
    expect(safeExternalUrl("  javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("\tjavascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("\njavascript:alert(1)")).toBeNull();
  });

  it("rejects URLs with embedded credentials (misleading)", () => {
    expect(safeExternalUrl("https://attacker.com@github.com/")).toBeNull();
    expect(safeExternalUrl("https://user:pass@example.com/")).toBeNull();
  });
});

describe("safeUrlOnHosts", () => {
  it("accepts exact host match", () => {
    expect(safeUrlOnHosts("https://github.com/user", ["github.com"])).toBe(
      "https://github.com/user"
    );
  });

  it("accepts subdomains of allowed hosts", () => {
    expect(safeUrlOnHosts("https://gist.github.com/abc", ["github.com"])).toBe(
      "https://gist.github.com/abc"
    );
    expect(safeUrlOnHosts("https://raw.githubusercontent.com/x", ["githubusercontent.com"])).toBe(
      "https://raw.githubusercontent.com/x"
    );
  });

  it("rejects similar-looking but distinct hosts", () => {
    expect(safeUrlOnHosts("https://github.com.attacker.com/", ["github.com"])).toBeNull();
    expect(safeUrlOnHosts("https://notgithub.com/", ["github.com"])).toBeNull();
    expect(safeUrlOnHosts("https://evilgithub.com/", ["github.com"])).toBeNull();
  });

  it("case-insensitive host match", () => {
    expect(safeUrlOnHosts("https://GitHub.com/user", ["github.com"])).toBe(
      "https://github.com/user"
    );
  });

  it("rejects non-http/https schemes regardless of host", () => {
    expect(safeUrlOnHosts("javascript:alert(1)", ["github.com"])).toBeNull();
    expect(safeUrlOnHosts("data:text/html,x", ["github.com"])).toBeNull();
  });

  it("rejects null/empty/invalid", () => {
    expect(safeUrlOnHosts(null, ["github.com"])).toBeNull();
    expect(safeUrlOnHosts("", ["github.com"])).toBeNull();
    expect(safeUrlOnHosts("not a url", ["github.com"])).toBeNull();
  });
});
