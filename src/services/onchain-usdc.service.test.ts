import { describe, it, expect } from "vitest";
import { centsToUsdcAtomic, formatUsdcAtomic, sendUsdc } from "./onchain-usdc.service";

describe("centsToUsdcAtomic", () => {
  it("converts whole-dollar amounts", () => {
    // $1.00 = 100 cents = 1_000_000 atomic USDC (6 decimals)
    expect(centsToUsdcAtomic(100)).toBe(BigInt(1_000_000));
    // $50,000 = 5_000_000 cents = 50_000_000_000 atomic
    expect(centsToUsdcAtomic(5_000_000)).toBe(BigInt("50000000000"));
  });

  it("converts cents-precision amounts", () => {
    // $0.05 = 5 cents = 50_000 atomic
    expect(centsToUsdcAtomic(5)).toBe(BigInt(50_000));
    // $12.34 = 1234 cents = 12_340_000 atomic
    expect(centsToUsdcAtomic(1234)).toBe(BigInt(12_340_000));
  });

  it("handles zero", () => {
    expect(centsToUsdcAtomic(0)).toBe(BigInt(0));
  });
});

describe("formatUsdcAtomic", () => {
  it("formats whole dollars", () => {
    expect(formatUsdcAtomic(BigInt(1_000_000))).toBe("1");
    expect(formatUsdcAtomic(BigInt("50000000000"))).toBe("50000");
  });

  it("formats fractional amounts", () => {
    expect(formatUsdcAtomic(BigInt(50_000))).toBe("0.05");
    expect(formatUsdcAtomic(BigInt(12_340_000))).toBe("12.34");
  });
});

describe("sendUsdc", () => {
  it("returns invalid_input on zero amount", async () => {
    const r = await sendUsdc({
      chain: "base",
      toAddress: "0xabcdef0123456789abcdef0123456789abcdef01",
      amountCents: 0,
    });
    expect(r.kind).toBe("invalid_input");
  });

  it("returns invalid_input on bad address", async () => {
    const r = await sendUsdc({
      chain: "base",
      toAddress: "0xnot-hex" as `0x${string}`,
      amountCents: 100,
    });
    expect(r.kind).toBe("invalid_input");
  });

  it("returns not_configured when env is missing", async () => {
    // SETTLEMENT_HOT_WALLET_PRIVATE_KEY isn't set in tests.
    const r = await sendUsdc({
      chain: "base",
      toAddress: "0xabcdef0123456789abcdef0123456789abcdef01",
      amountCents: 100,
    });
    expect(r.kind).toBe("not_configured");
  });
});
