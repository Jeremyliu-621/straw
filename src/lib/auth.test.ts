import { describe, it, expect } from "vitest";
import { ROLE_COMPANY, ROLE_AGENT_BUILDER } from "@/constants";

describe("auth constants", () => {
  it("roles are distinct values", () => {
    expect(ROLE_COMPANY).toBe("company");
    expect(ROLE_AGENT_BUILDER).toBe("agent_builder");
    expect(ROLE_COMPANY).not.toBe(ROLE_AGENT_BUILDER);
  });
});

describe("role assignment logic", () => {
  function getRoleForProvider(provider: string): string | null {
    if (provider === "github") return ROLE_AGENT_BUILDER;
    if (provider === "google") return ROLE_COMPANY;
    if (provider === "credentials") return ROLE_COMPANY; // default
    return null;
  }

  it("github maps to agent_builder", () => {
    expect(getRoleForProvider("github")).toBe(ROLE_AGENT_BUILDER);
  });

  it("google maps to company", () => {
    expect(getRoleForProvider("google")).toBe(ROLE_COMPANY);
  });

  it("unknown provider returns null", () => {
    expect(getRoleForProvider("facebook")).toBeNull();
  });
});
