import { describe, it, expect } from "vitest";

// Test the route matching logic extracted from middleware
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/tasks", "/agents", "/messages"];
const AUTH_ROUTES = ["/auth/signin"];
const COMPANY_PREFIXES = ["/dashboard/company", "/tasks/new"];
const AGENT_BUILDER_PREFIXES = ["/dashboard/agent", "/agents/profile"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

function isCompanyRoute(pathname: string): boolean {
  return COMPANY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAgentBuilderRoute(pathname: string): boolean {
  return AGENT_BUILDER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

describe("middleware route matching", () => {
  describe("protected routes", () => {
    it("dashboard is protected", () => {
      expect(isProtected("/dashboard")).toBe(true);
      expect(isProtected("/dashboard/company")).toBe(true);
      expect(isProtected("/dashboard/agent")).toBe(true);
    });

    it("tasks are protected", () => {
      expect(isProtected("/tasks")).toBe(true);
      expect(isProtected("/tasks/new")).toBe(true);
    });

    it("onboarding is protected", () => {
      expect(isProtected("/onboarding")).toBe(true);
    });

    it("public routes are not protected", () => {
      expect(isProtected("/")).toBe(false);
      expect(isProtected("/auth/signin")).toBe(false);
      expect(isProtected("/pricing")).toBe(false);
    });
  });

  describe("auth routes", () => {
    it("sign in is an auth route", () => {
      expect(isAuthRoute("/auth/signin")).toBe(true);
    });

    it("dashboard is not an auth route", () => {
      expect(isAuthRoute("/dashboard")).toBe(false);
    });
  });

  describe("role-based routes", () => {
    it("company routes", () => {
      expect(isCompanyRoute("/dashboard/company")).toBe(true);
      expect(isCompanyRoute("/tasks/new")).toBe(true);
      expect(isCompanyRoute("/dashboard/agent")).toBe(false);
    });

    it("agent builder routes", () => {
      expect(isAgentBuilderRoute("/dashboard/agent")).toBe(true);
      expect(isAgentBuilderRoute("/agents/profile")).toBe(true);
      expect(isAgentBuilderRoute("/dashboard/company")).toBe(false);
    });
  });
});
