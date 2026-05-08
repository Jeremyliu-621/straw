import { describe, it, expect, vi } from "vitest";

// Stub env so AUTH_SECRET is available in this test (env.ts caches off
// process.env at module init).
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-must-be-long-enough-for-zod";

import { buildChallenge, verifyChallenge } from "./wallet-verify.service";

const VALID_ADDR = "0xabcdef0123456789abcdef0123456789abcdef01";
const USER = "user-uuid-123";

describe("buildChallenge", () => {
  it("returns nonce, ts, sig, message", () => {
    const c = buildChallenge(USER, VALID_ADDR);
    expect(typeof c.nonce).toBe("string");
    expect(typeof c.ts).toBe("number");
    expect(typeof c.sig).toBe("string");
    expect(typeof c.message).toBe("string");
  });

  it("nonce is 32 hex chars", () => {
    const c = buildChallenge(USER, VALID_ADDR);
    expect(c.nonce).toMatch(/^[0-9a-f]{32}$/);
  });

  it("sig is 64 hex chars (sha256)", () => {
    const c = buildChallenge(USER, VALID_ADDR);
    expect(c.sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("message includes address, nonce, and timestamp", () => {
    const c = buildChallenge(USER, VALID_ADDR);
    expect(c.message).toContain(VALID_ADDR);
    expect(c.message).toContain(c.nonce);
    expect(c.message).toContain(new Date(c.ts).toISOString());
  });

  it("two challenges for same user/addr produce different nonces", () => {
    const a = buildChallenge(USER, VALID_ADDR);
    const b = buildChallenge(USER, VALID_ADDR);
    expect(a.nonce).not.toBe(b.nonce);
  });
});

describe("verifyChallenge — HMAC and freshness gates (no signature check)", () => {
  // We can't easily test the EIP-191 signature without a real wallet, but
  // we can verify everything ELSE rejects correctly before viem is even
  // called.

  it("rejects malformed address", async () => {
    const c = buildChallenge(USER, VALID_ADDR);
    const result = await verifyChallenge({
      userId: USER,
      address: "0xnot-hex",
      nonce: c.nonce,
      ts: c.ts,
      sig: c.sig,
      signature: "0x" + "0".repeat(130) as `0x${string}`,
    });
    expect(result?.kind).toBe("challenge_invalid_format");
  });

  it("rejects malformed nonce", async () => {
    const c = buildChallenge(USER, VALID_ADDR);
    const result = await verifyChallenge({
      userId: USER,
      address: VALID_ADDR,
      nonce: "short-nonce",
      ts: c.ts,
      sig: c.sig,
      signature: "0x" + "0".repeat(130) as `0x${string}`,
    });
    expect(result?.kind).toBe("challenge_invalid_format");
  });

  it("rejects tampered HMAC", async () => {
    const c = buildChallenge(USER, VALID_ADDR);
    const tampered = c.sig.slice(0, -1) + (c.sig.slice(-1) === "0" ? "1" : "0");
    const result = await verifyChallenge({
      userId: USER,
      address: VALID_ADDR,
      nonce: c.nonce,
      ts: c.ts,
      sig: tampered,
      signature: "0x" + "0".repeat(130) as `0x${string}`,
    });
    expect(result?.kind).toBe("challenge_bad_hmac");
  });

  it("rejects different user (HMAC ties to userId)", async () => {
    const c = buildChallenge(USER, VALID_ADDR);
    const result = await verifyChallenge({
      userId: "different-user",
      address: VALID_ADDR,
      nonce: c.nonce,
      ts: c.ts,
      sig: c.sig,
      signature: "0x" + "0".repeat(130) as `0x${string}`,
    });
    expect(result?.kind).toBe("challenge_bad_hmac");
  });

  it("rejects expired challenge (>5min old)", async () => {
    const c = buildChallenge(USER, VALID_ADDR);
    // Synthesize a fresh sig 6 minutes in the past.
    const oldTs = Date.now() - 6 * 60 * 1000;
    const { computeHmacInternal } = await synthesize();
    const oldSig = computeHmacInternal(c.nonce, oldTs, USER, VALID_ADDR);
    const result = await verifyChallenge({
      userId: USER,
      address: VALID_ADDR,
      nonce: c.nonce,
      ts: oldTs,
      sig: oldSig,
      signature: "0x" + "0".repeat(130) as `0x${string}`,
    });
    expect(result?.kind).toBe("challenge_expired");
  });
});

// Local re-implementation of the HMAC for tests that need to forge an
// "old" challenge. Uses the same secret as the real service.
async function synthesize() {
  const { createHmac } = await import("crypto");
  return {
    computeHmacInternal: (nonce: string, ts: number, userId: string, address: string) =>
      createHmac("sha256", process.env.AUTH_SECRET!)
        .update(`${nonce}|${ts}|${userId}|${address}`)
        .digest("hex"),
  };
}
