import { describe, it, expect } from "vitest";
import {
  walletUpdateSchema,
  evmAddressSchema,
  isLiveMethod,
  isValidEvmAddress,
  defaultChainForMethod,
  normalizeWalletUpdate,
  type WalletUpdate,
} from "./wallet-validation";
import { PAYOUT_METHOD } from "@/constants";

const VALID_ADDR = "0x" + "a".repeat(40);
const VALID_ADDR_MIXED = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf12";

describe("evmAddressSchema", () => {
  it("accepts valid lowercase address", () => {
    expect(evmAddressSchema.safeParse(VALID_ADDR).success).toBe(true);
  });

  it("accepts mixed-case (EIP-55-style) address", () => {
    expect(evmAddressSchema.safeParse(VALID_ADDR_MIXED).success).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["0x", "no body"],
    ["abc" + "a".repeat(40), "no 0x prefix"],
    ["0x" + "z".repeat(40), "non-hex char"],
    ["0x" + "a".repeat(39), "too short"],
    ["0x" + "a".repeat(41), "too long"],
  ])("rejects %s (%s)", (input) => {
    expect(evmAddressSchema.safeParse(input).success).toBe(false);
  });
});

describe("isValidEvmAddress", () => {
  it("matches a valid address", () => {
    expect(isValidEvmAddress(VALID_ADDR)).toBe(true);
  });

  it("rejects lookalikes", () => {
    expect(isValidEvmAddress("0x" + "z".repeat(40))).toBe(false);
    expect(isValidEvmAddress("not an address")).toBe(false);
  });
});

describe("isLiveMethod", () => {
  it("accepts live rails", () => {
    expect(isLiveMethod(PAYOUT_METHOD.ONCHAIN_USDC)).toBe(true);
    expect(isLiveMethod(PAYOUT_METHOD.COINBASE_COMMERCE)).toBe(true);
  });

  it("rejects designed-but-not-wired rails", () => {
    expect(isLiveMethod(PAYOUT_METHOD.STRIPE_CRYPTO)).toBe(false);
    expect(isLiveMethod(PAYOUT_METHOD.STRIPE_USD)).toBe(false);
  });
});

describe("defaultChainForMethod", () => {
  it("returns base for onchain_usdc", () => {
    expect(defaultChainForMethod(PAYOUT_METHOD.ONCHAIN_USDC)).toBe("base");
  });

  it("returns null for non-onchain rails", () => {
    expect(defaultChainForMethod(PAYOUT_METHOD.COINBASE_COMMERCE)).toBeNull();
    expect(defaultChainForMethod(PAYOUT_METHOD.STRIPE_USD)).toBeNull();
  });
});

describe("walletUpdateSchema", () => {
  describe("onchain_usdc", () => {
    it("accepts valid address + chain", () => {
      const r = walletUpdateSchema.safeParse({
        payout_method: PAYOUT_METHOD.ONCHAIN_USDC,
        payout_address: VALID_ADDR,
        payout_chain: "base",
      });
      expect(r.success).toBe(true);
    });

    it("accepts address without chain (default fills in later)", () => {
      const r = walletUpdateSchema.safeParse({
        payout_method: PAYOUT_METHOD.ONCHAIN_USDC,
        payout_address: VALID_ADDR,
      });
      expect(r.success).toBe(true);
    });

    it("rejects missing address", () => {
      const r = walletUpdateSchema.safeParse({
        payout_method: PAYOUT_METHOD.ONCHAIN_USDC,
      });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues[0].path).toEqual(["payout_address"]);
      }
    });

    it("rejects malformed address", () => {
      const r = walletUpdateSchema.safeParse({
        payout_method: PAYOUT_METHOD.ONCHAIN_USDC,
        payout_address: "0xnot-hex",
      });
      expect(r.success).toBe(false);
    });

    it("rejects unsupported chain", () => {
      const r = walletUpdateSchema.safeParse({
        payout_method: PAYOUT_METHOD.ONCHAIN_USDC,
        payout_address: VALID_ADDR,
        payout_chain: "polygon",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("coinbase_commerce", () => {
    it("accepts no address (Coinbase routes to merchant)", () => {
      const r = walletUpdateSchema.safeParse({
        payout_method: PAYOUT_METHOD.COINBASE_COMMERCE,
      });
      expect(r.success).toBe(true);
    });

    it("accepts an optional address", () => {
      const r = walletUpdateSchema.safeParse({
        payout_method: PAYOUT_METHOD.COINBASE_COMMERCE,
        payout_address: VALID_ADDR,
      });
      expect(r.success).toBe(true);
    });
  });

  describe("designed-but-not-wired rails", () => {
    it("rejects stripe_crypto", () => {
      const r = walletUpdateSchema.safeParse({
        payout_method: PAYOUT_METHOD.STRIPE_CRYPTO,
      });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues[0].message).toMatch(/not a live rail/);
      }
    });

    it("rejects stripe_usd", () => {
      const r = walletUpdateSchema.safeParse({
        payout_method: PAYOUT_METHOD.STRIPE_USD,
      });
      expect(r.success).toBe(false);
    });
  });

  it("rejects unknown method", () => {
    const r = walletUpdateSchema.safeParse({
      payout_method: "paypal",
    });
    expect(r.success).toBe(false);
  });

  it("rejects extra fields (strict)", () => {
    const r = walletUpdateSchema.safeParse({
      payout_method: PAYOUT_METHOD.ONCHAIN_USDC,
      payout_address: VALID_ADDR,
      payout_chain: "base",
      sneaky_field: "value",
    });
    expect(r.success).toBe(false);
  });
});

describe("normalizeWalletUpdate", () => {
  it("lowercases mixed-case address for onchain", () => {
    const input: WalletUpdate = {
      payout_method: PAYOUT_METHOD.ONCHAIN_USDC,
      payout_address: VALID_ADDR_MIXED,
      payout_chain: "base",
    };
    const out = normalizeWalletUpdate(input);
    expect(out.payout_address).toBe(VALID_ADDR_MIXED.toLowerCase());
  });

  it("fills in default chain when missing for onchain_usdc", () => {
    const input: WalletUpdate = {
      payout_method: PAYOUT_METHOD.ONCHAIN_USDC,
      payout_address: VALID_ADDR,
    };
    const out = normalizeWalletUpdate(input);
    expect(out.payout_chain).toBe("base");
  });

  it("strips chain for coinbase_commerce even if passed", () => {
    const input: WalletUpdate = {
      payout_method: PAYOUT_METHOD.COINBASE_COMMERCE,
      payout_address: VALID_ADDR,
      payout_chain: "base",
    };
    const out = normalizeWalletUpdate(input);
    expect(out.payout_chain).toBeNull();
  });

  it("returns null address for coinbase_commerce when address omitted", () => {
    const input: WalletUpdate = {
      payout_method: PAYOUT_METHOD.COINBASE_COMMERCE,
    };
    const out = normalizeWalletUpdate(input);
    expect(out.payout_address).toBeNull();
    expect(out.payout_chain).toBeNull();
  });
});
