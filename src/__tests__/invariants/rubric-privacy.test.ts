/**
 * INVARIANT: Rubric weights are fully visible to agents.
 *
 * DECISIONS.md D10 + REQUIREMENTS.md (updated 2026-04-21):
 *   Full rubric — criteria names AND weights — is exposed to agents.
 *   The product bet is that agents with complete information about
 *   what the company values will build better submissions than agents
 *   guessing. "Gaming the scoring formula" isn't a real failure mode
 *   when the formula IS the company's definition of quality.
 *
 * This file is the regression gate for that policy. A future refactor
 * that re-hides `weight` in an agent-facing response will fail here.
 *
 * This test file previously asserted the OPPOSITE (weights hidden). It
 * was flipped on 2026-04-21 alongside the product decision. Keeping the
 * filename so git history tracks the reversal explicitly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockCompanyUser,
  mockAgentUser,
  makeGetRequest,
  parseJsonResponse,
} from "@/test/api-test-helpers";
import type { AuthenticatedUser } from "@/lib/auth-unified";

// ── Shared mock plumbing ─────────────────────────────────────

let mockUser: AuthenticatedUser | null = null;

vi.mock("@/lib/auth-unified", () => ({
  authenticateRequest: vi.fn(() => Promise.resolve(mockUser)),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitResponse: vi.fn(() => null),
}));

const mockResultsByTable: Record<string, Array<{ data: unknown; error: unknown }>> = {};
const callCounters: Record<string, number> = {};

function pushMockResult(table: string, result: { data: unknown; error: unknown }) {
  if (!mockResultsByTable[table]) mockResultsByTable[table] = [];
  mockResultsByTable[table].push(result);
}

function nextMockResult(table: string): { data: unknown; error: unknown } {
  const idx = callCounters[table] ?? 0;
  callCounters[table] = idx + 1;
  return (mockResultsByTable[table] ?? [])[idx] ?? { data: null, error: null };
}

const selectedColumns: Record<string, string[]> = {};

function createTableChain(tableName: string) {
  const chain: Record<string, unknown> = {};

  chain.select = vi.fn((...args: unknown[]) => {
    if (typeof args[0] === "string") {
      if (!selectedColumns[tableName]) selectedColumns[tableName] = [];
      selectedColumns[tableName].push(args[0] as string);
    }
    return chain;
  });

  for (const m of ["eq", "order", "limit", "gt", "lt", "in", "or", "is", "update", "insert", "delete"]) {
    chain[m] = vi.fn((..._args: unknown[]) => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(nextMockResult(tableName)));
  chain.maybeSingle = vi.fn(() => Promise.resolve(nextMockResult(tableName)));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(nextMockResult(tableName)).then(resolve);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => createTableChain(table)),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(() =>
          Promise.resolve({ data: { signedUrl: "https://signed.url/x" }, error: null })
        ),
      })),
    },
  })),
}));

const { GET: getLegacyTask } = await import("@/app/api/tasks/[id]/route");
const { GET: getV1Task } = await import("@/app/api/v1/tasks/[id]/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(callCounters).forEach((k) => delete callCounters[k]);
  Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
  Object.keys(selectedColumns).forEach((k) => delete selectedColumns[k]);
});

// ── Legacy route: /api/tasks/[id] ─────────────────────────────

describe("invariant: rubric weights visible to agents (D10)", () => {
  describe("GET /api/tasks/[id]", () => {
    it("selects weight in the SQL column list for an agent caller", async () => {
      mockUser = mockAgentUser();
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1,
          status: "open",
          title: "test",
          description: "test",
        },
        error: null,
      });
      pushMockResult("rubric_criteria", {
        data: [{ name: "Correctness", description: "tests pass", position: 0, weight: 60 }],
        error: null,
      });

      const req = makeGetRequest(`http://localhost/api/tasks/${UUID.task1}`);
      await getLegacyTask(req, makeParams(UUID.task1));

      const selects = selectedColumns["rubric_criteria"] ?? [];
      expect(selects.length).toBeGreaterThan(0);
      for (const colList of selects) {
        expect(colList).toContain("weight");
      }
    });

    it("returns weight in the rubric_criteria response body for an agent", async () => {
      mockUser = mockAgentUser();
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1,
          status: "open",
          title: "test",
          description: "test",
        },
        error: null,
      });
      pushMockResult("rubric_criteria", {
        data: [{ name: "Correctness", description: "tests pass", position: 0, weight: 60 }],
        error: null,
      });

      const req = makeGetRequest(`http://localhost/api/tasks/${UUID.task1}`);
      const res = await getLegacyTask(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      const criteria = (body as { rubric_criteria?: Array<Record<string, unknown>> })
        .rubric_criteria ?? [];
      expect(criteria.length).toBeGreaterThan(0);
      expect(criteria.every((c) => "weight" in c)).toBe(true);
    });

    it("returns weight for a company (task owner) caller as well", async () => {
      mockUser = mockCompanyUser();
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1, // same as mockCompanyUser supabaseId
          status: "open",
          title: "test",
          description: "test",
        },
        error: null,
      });
      pushMockResult("rubric_criteria", {
        data: [{ name: "Correctness", description: "tests pass", position: 0, weight: 60 }],
        error: null,
      });

      const req = makeGetRequest(`http://localhost/api/tasks/${UUID.task1}`);
      const res = await getLegacyTask(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      const criteria = (body as { rubric_criteria?: Array<Record<string, unknown>> })
        .rubric_criteria ?? [];
      expect(criteria.some((c) => "weight" in c)).toBe(true);
    });
  });

  // ── v1 route: /api/v1/tasks/[id] ─────────────────────────────

  describe("GET /api/v1/tasks/[id]", () => {
    it("selects weight in the SQL column list for an agent caller", async () => {
      mockUser = mockAgentUser();
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          title: "test",
          description: "test",
          category: "code-generation",
          input_spec: "x",
          output_spec: "y",
          deadline: new Date(Date.now() + 86400000).toISOString(),
          budget_cents: 10000,
          eval_mode: "llm",
          status: "open",
          max_submissions_per_agent: 5,
          company_id: UUID.user1,
          created_at: new Date().toISOString(),
        },
        error: null,
      });
      pushMockResult("rubric_criteria", {
        data: [{ name: "Correctness", description: "x", position: 0, weight: 50 }],
        error: null,
      });
      pushMockResult("submissions", { data: null, error: null });

      const req = makeGetRequest(`http://localhost/api/v1/tasks/${UUID.task1}`);
      await getV1Task(req, makeParams(UUID.task1));

      const selects = selectedColumns["rubric_criteria"] ?? [];
      expect(selects.length).toBeGreaterThan(0);
      for (const colList of selects) {
        expect(colList).toContain("weight");
      }
    });

    it("returns weight in the criteria array body for an agent caller", async () => {
      mockUser = mockAgentUser();
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          title: "test",
          description: "test",
          category: "code-generation",
          input_spec: "x",
          output_spec: "y",
          deadline: new Date(Date.now() + 86400000).toISOString(),
          budget_cents: 10000,
          eval_mode: "llm",
          status: "open",
          max_submissions_per_agent: 5,
          company_id: UUID.user1,
          created_at: new Date().toISOString(),
        },
        error: null,
      });
      pushMockResult("rubric_criteria", {
        data: [{ name: "Correctness", description: "x", position: 0, weight: 50 }],
        error: null,
      });
      pushMockResult("submissions", { data: null, error: null });

      const req = makeGetRequest(`http://localhost/api/v1/tasks/${UUID.task1}`);
      const res = await getV1Task(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      const criteria = (body as { criteria?: Array<Record<string, unknown>> }).criteria ?? [];
      expect(criteria.length).toBeGreaterThan(0);
      for (const c of criteria) {
        expect(c).toHaveProperty("weight");
      }
    });
  });
});
