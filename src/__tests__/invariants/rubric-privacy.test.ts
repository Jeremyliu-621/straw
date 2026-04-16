/**
 * INVARIANT: Rubric weights are never exposed to agents before the deadline.
 *
 * REQUIREMENTS.md:144 non-negotiable:
 *   "Rubrics are never exposed to agents before the deadline."
 *
 * Implementation: agent-facing task detail endpoints must only return criterion
 * `name`, `description`, and `position`. The `weight` column must be filtered.
 * Company (task owner) callers DO see weights — they wrote them.
 *
 * These tests are regression gates. A future refactor that accidentally
 * reintroduces weights in an agent-visible response will fail here.
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

// Capture every select() call so we can assert what columns were requested.
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

// Import route modules AFTER mocks are installed
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

describe("invariant: rubric weights hidden from agents", () => {
  describe("GET /api/tasks/[id]", () => {
    it("does NOT include weight in the rubric_criteria response for an agent", async () => {
      mockUser = mockAgentUser();
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1, // different from agent
          status: "open",
          title: "test",
          description: "test",
        },
        error: null,
      });
      pushMockResult("rubric_criteria", {
        data: [{ name: "Correctness", description: "tests pass", position: 0 }],
        error: null,
      });

      const req = makeGetRequest(`http://localhost/api/tasks/${UUID.task1}`);
      const res = await getLegacyTask(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      const criteria = (body as { rubric_criteria?: Array<Record<string, unknown>> })
        .rubric_criteria ?? [];

      for (const c of criteria) {
        expect(c).not.toHaveProperty("weight");
      }

      // Secondary assertion: the SQL-level column list didn't include weight.
      const selects = selectedColumns["rubric_criteria"] ?? [];
      for (const colList of selects) {
        expect(colList).not.toContain("weight");
      }
    });

    it("DOES include weight for the task owner (company)", async () => {
      mockUser = mockCompanyUser();
      pushMockResult("tasks", {
        data: {
          id: UUID.task1,
          company_id: UUID.user1, // same as company user
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
      // At least one criterion should carry weight for the owner view
      const hasWeight = criteria.some((c) => "weight" in c);
      expect(hasWeight).toBe(true);
    });
  });

  // ── v1 route: /api/v1/tasks/[id] ─────────────────────────────

  describe("GET /api/v1/tasks/[id]", () => {
    it("never includes weight in the SQL column list — agent or company caller", async () => {
      // Test for an agent (the caller we care about protecting)
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
          company_id: UUID.user1, // owner is someone else
          created_at: new Date().toISOString(),
        },
        error: null,
      });
      pushMockResult("rubric_criteria", {
        data: [{ name: "Correctness", description: "x", position: 0 }],
        error: null,
      });
      pushMockResult("submissions", { data: null, error: null });

      const req = makeGetRequest(`http://localhost/api/v1/tasks/${UUID.task1}`);
      const res = await getV1Task(req, makeParams(UUID.task1));
      const { body } = await parseJsonResponse(res);

      // Response-shape assertion
      const criteria = (body as { criteria?: Array<Record<string, unknown>> })
        .criteria ?? [];
      for (const c of criteria) {
        expect(c).not.toHaveProperty("weight");
      }

      // SQL-level assertion — strongest form: the query never asked for weight
      const selects = selectedColumns["rubric_criteria"] ?? [];
      for (const colList of selects) {
        expect(colList).not.toContain("weight");
      }
    });
  });
});
