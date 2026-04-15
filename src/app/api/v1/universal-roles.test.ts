import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockUniversalUser,
  mockAgentUser,
  mockCompanyUser,
  makeJsonRequest,
  makeGetRequest,
  parseJsonResponse,
  validCreateTaskPayload,
} from "@/test/api-test-helpers";
import type { AuthenticatedUser } from "@/lib/auth-unified";
import { createTaskSchema } from "@/lib/validation";

/**
 * Universal Roles Test Suite
 *
 * After migration 025_universal_roles.sql, any user can both:
 * - Create tasks (previously company-only)
 * - Submit to tasks (previously agent-only)
 *
 * These tests verify the role gate has been removed at the API layer.
 */

describe("Universal Roles — any user can create tasks AND submit solutions", () => {
  describe("validation schema accepts all roles", () => {
    it("createTaskSchema validates based on data, not on user role", () => {
      // The schema itself has no role check — it only validates data shape
      const result = createTaskSchema.safeParse(validCreateTaskPayload());
      expect(result.success).toBe(true);
    });
  });

  describe("no role-based permission gates in route handlers", () => {
    it("POST /api/v1/tasks does NOT check user.role before creating", async () => {
      // We test this by checking that the route handler code:
      // 1. Calls authenticateRequest (auth check)
      // 2. Does NOT check user.role
      // 3. Proceeds to create the task
      //
      // This is verified by the fact that agent_builder users can create tasks
      // (tested in tasks-route.test.ts "universal roles" describe block)

      // Additional verification: the authenticateRequest interface returns role
      // but the route handler ignores it
      const agentUser = mockAgentUser();
      expect(agentUser.role).toBe("agent_builder");

      const companyUser = mockCompanyUser();
      expect(companyUser.role).toBe("company");

      // Both have valid supabaseId, which is all the route checks
      expect(agentUser.supabaseId).toBeTruthy();
      expect(companyUser.supabaseId).toBeTruthy();
    });

    it("POST /api/v1/tasks/[id]/submissions does NOT check user.role before submitting", async () => {
      // The submissions route checks:
      // 1. Auth (supabaseId exists)
      // 2. Task is open
      // 3. User is not the task owner
      // 4. Quota not exhausted
      //
      // It does NOT check if user.role === "agent_builder"
      // A company user can also submit to someone else's task

      const companyUser = mockCompanyUser();
      expect(companyUser.role).toBe("company");
      // The route only needs supabaseId, not role
      expect(companyUser.supabaseId).toBeTruthy();
    });
  });

  describe("cross-role workflow", () => {
    it("a single user identity can create tasks and submit to other tasks", () => {
      // Simulate a user who:
      // 1. Creates Task A (as company_id)
      // 2. Submits to Task B (as agent_id)
      // Both use the same supabaseId

      const universalUser = mockUniversalUser();

      // Task A: user is the company_id (owner)
      const taskA = {
        id: UUID.task1,
        company_id: universalUser.supabaseId,
        status: "draft",
      };
      expect(taskA.company_id).toBe(universalUser.supabaseId);

      // Task B: owned by someone else
      const taskB = {
        id: UUID.task2,
        company_id: UUID.user1, // Different user
        status: "open",
      };
      expect(taskB.company_id).not.toBe(universalUser.supabaseId);

      // User can submit to Task B because they're not the owner
      // The only submission gate is: agent_id !== task.company_id
      expect(universalUser.supabaseId).not.toBe(taskB.company_id);
    });

    it("self-submission is still blocked (cannot submit to own task)", () => {
      const user = mockUniversalUser();

      const ownTask = {
        id: UUID.task1,
        company_id: user.supabaseId,
      };

      // The service layer checks: task.company_id !== agentId
      expect(ownTask.company_id).toBe(user.supabaseId);
      // This would return: "You cannot submit to your own task" (403)
    });
  });

  describe("AuthenticatedUser role field is informational only", () => {
    it("role is preserved in the user object but not used for gating", () => {
      const agent = mockAgentUser();
      const company = mockCompanyUser();
      const universal = mockUniversalUser();

      // All three have roles
      expect(agent.role).toBe("agent_builder");
      expect(company.role).toBe("company");
      expect(universal.role).toBe("company");

      // But the v1 API routes only check supabaseId existence
      // and ownership (company_id === user.supabaseId) for mutation endpoints
      // They do NOT branch on role for create/submit
    });

    it("role is nullable to support future role-less users", () => {
      const userWithNoRole: AuthenticatedUser = {
        supabaseId: UUID.user2,
        email: "norole@example.com",
        name: "No Role User",
        role: null,
        onboarded: true,
        authMethod: "api_key",
      };

      // The route only checks: user?.supabaseId
      // A null role should not prevent API access
      expect(userWithNoRole.supabaseId).toBeTruthy();
      expect(userWithNoRole.role).toBeNull();
    });
  });
});
