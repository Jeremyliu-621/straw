import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "./coinbase-commerce.service";

describe("verifyWebhookSignature", () => {
  const secret = "test-shared-secret";
  const body = JSON.stringify({ event: { id: "evt_1", type: "charge:confirmed" } });
  const validSig = createHmac("sha256", secret).update(body).digest("hex");

  it("accepts a valid signature", () => {
    expect(verifyWebhookSignature(body, validSig, secret)).toBe(true);
  });

  it("rejects null signature", () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(verifyWebhookSignature(body, "", secret)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const wrongSig = createHmac("sha256", "wrong-secret").update(body).digest("hex");
    expect(verifyWebhookSignature(body, wrongSig, secret)).toBe(false);
  });

  it("rejects tampered body", () => {
    const tamperedBody = body.replace("charge:confirmed", "charge:created");
    expect(verifyWebhookSignature(tamperedBody, validSig, secret)).toBe(false);
  });

  it("rejects non-hex signature without throwing", () => {
    expect(verifyWebhookSignature(body, "not-hex-at-all", secret)).toBe(false);
  });

  it("rejects signature of wrong length", () => {
    expect(verifyWebhookSignature(body, validSig.slice(0, 32), secret)).toBe(false);
    expect(verifyWebhookSignature(body, validSig + "ff", secret)).toBe(false);
  });

  it("uses timing-safe equality for matched-length comparisons", () => {
    // Same length, all zeros — should NOT throw, should return false.
    const zeros = "0".repeat(validSig.length);
    expect(verifyWebhookSignature(body, zeros, secret)).toBe(false);
  });
});
