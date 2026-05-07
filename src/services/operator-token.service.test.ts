import { describe, it, expect } from "vitest";
import {
  generateOperatorToken,
  hashOperatorToken,
  isValidOperatorTokenFormat,
  childSubmissionBudget,
  type OperatorTokenRow,
} from "./operator-token.service";
import { OPERATOR_TOKEN_PREFIX, OPERATOR_TOKEN_RANDOM_BYTES } from "@/constants";

describe("operator-token.service crypto", () => {
  describe("generateOperatorToken", () => {
    it("returns plaintext, hash, and prefix", () => {
      const t = generateOperatorToken();
      expect(typeof t.plaintext).toBe("string");
      expect(typeof t.hash).toBe("string");
      expect(typeof t.prefix).toBe("string");
    });

    it("plaintext starts with the operator prefix", () => {
      const t = generateOperatorToken();
      expect(t.plaintext.startsWith(OPERATOR_TOKEN_PREFIX)).toBe(true);
    });

    it("plaintext length matches prefix + 2*random_bytes", () => {
      const t = generateOperatorToken();
      expect(t.plaintext.length).toBe(
        OPERATOR_TOKEN_PREFIX.length + OPERATOR_TOKEN_RANDOM_BYTES * 2,
      );
    });

    it("prefix is exactly 16 chars (for display)", () => {
      const t = generateOperatorToken();
      expect(t.prefix.length).toBe(16);
      expect(t.plaintext.startsWith(t.prefix)).toBe(true);
    });

    it("hash is sha256 of plaintext (64 hex chars)", () => {
      const t = generateOperatorToken();
      expect(t.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(t.hash).toBe(hashOperatorToken(t.plaintext));
    });

    it("two generations produce different tokens", () => {
      const a = generateOperatorToken();
      const b = generateOperatorToken();
      expect(a.plaintext).not.toBe(b.plaintext);
      expect(a.hash).not.toBe(b.hash);
    });
  });

  describe("hashOperatorToken", () => {
    it("is deterministic", () => {
      const value = "straw_op_abcdef0123456789abcdef0123456789ab";
      expect(hashOperatorToken(value)).toBe(hashOperatorToken(value));
    });

    it("produces a different hash for a different input", () => {
      const a = "straw_op_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const b = "straw_op_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      expect(hashOperatorToken(a)).not.toBe(hashOperatorToken(b));
    });
  });

  describe("isValidOperatorTokenFormat", () => {
    it("accepts a freshly-generated token", () => {
      const t = generateOperatorToken();
      expect(isValidOperatorTokenFormat(t.plaintext)).toBe(true);
    });

    it("rejects an api_key (different prefix)", () => {
      const apiKey =
        "straw_sk_" +
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      expect(isValidOperatorTokenFormat(apiKey)).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidOperatorTokenFormat("")).toBe(false);
    });

    it("rejects token with right prefix but wrong length", () => {
      expect(isValidOperatorTokenFormat("straw_op_short")).toBe(false);
      expect(
        isValidOperatorTokenFormat("straw_op_" + "a".repeat(64)),
      ).toBe(false);
    });

    it("rejects bare prefix without random bytes", () => {
      expect(isValidOperatorTokenFormat(OPERATOR_TOKEN_PREFIX)).toBe(false);
    });
  });
});

describe("childSubmissionBudget", () => {
  function makeToken(monthly: number, pct: number): OperatorTokenRow {
    return {
      id: "op-1",
      operator_user_id: "user-1",
      token_hash: "h",
      prefix: "p",
      label: null,
      monthly_quota_submissions: monthly,
      used_quota_submissions: 0,
      child_quota_pct: pct,
      revoked_at: null,
      revoked_reason: null,
      last_used_at: null,
      created_at: "now",
      updated_at: "now",
    };
  }

  it("returns the full quota when child_quota_pct is 100", () => {
    expect(childSubmissionBudget(makeToken(1000, 100))).toBe(1000);
  });

  it("returns the floor of the percent fraction", () => {
    expect(childSubmissionBudget(makeToken(1000, 25))).toBe(250);
    expect(childSubmissionBudget(makeToken(1000, 33))).toBe(330);
    // 1000 * 67 / 100 = 670; 1000 * 1 / 100 = 10.
    expect(childSubmissionBudget(makeToken(1000, 67))).toBe(670);
    expect(childSubmissionBudget(makeToken(1000, 1))).toBe(10);
  });

  it("handles small monthly quotas", () => {
    expect(childSubmissionBudget(makeToken(50, 50))).toBe(25);
    expect(childSubmissionBudget(makeToken(7, 50))).toBe(3); // floor(3.5)
  });
});
