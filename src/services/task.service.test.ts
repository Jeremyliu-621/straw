import { describe, it, expect } from "vitest";
import { isValidTransition, getValidTransitions } from "./task.service";

describe("task status state machine", () => {
  describe("isValidTransition", () => {
    it("draft → open is valid", () => {
      expect(isValidTransition("draft", "open")).toBe(true);
    });

    it("open → evaluating is valid", () => {
      expect(isValidTransition("open", "evaluating")).toBe(true);
    });

    it("evaluating → closed is valid", () => {
      expect(isValidTransition("evaluating", "closed")).toBe(true);
    });

    it("draft → evaluating is invalid (skips open)", () => {
      expect(isValidTransition("draft", "evaluating")).toBe(false);
    });

    it("open → closed is invalid (skips evaluating)", () => {
      expect(isValidTransition("open", "closed")).toBe(false);
    });

    it("closed → anything is invalid", () => {
      expect(isValidTransition("closed", "draft")).toBe(false);
      expect(isValidTransition("closed", "open")).toBe(false);
      expect(isValidTransition("closed", "evaluating")).toBe(false);
    });

    it("same status is invalid (no self-transitions)", () => {
      expect(isValidTransition("open", "open")).toBe(false);
      expect(isValidTransition("closed", "closed")).toBe(false);
    });

    it("backward transitions are invalid", () => {
      expect(isValidTransition("open", "draft")).toBe(false);
      expect(isValidTransition("evaluating", "open")).toBe(false);
      expect(isValidTransition("closed", "evaluating")).toBe(false);
    });
  });

  describe("getValidTransitions", () => {
    it("draft can go to open", () => {
      expect(getValidTransitions("draft")).toEqual(["open"]);
    });

    it("open can go to evaluating", () => {
      expect(getValidTransitions("open")).toEqual(["evaluating"]);
    });

    it("evaluating can go to closed", () => {
      expect(getValidTransitions("evaluating")).toEqual(["closed"]);
    });

    it("closed has no valid transitions", () => {
      expect(getValidTransitions("closed")).toEqual([]);
    });
  });
});
