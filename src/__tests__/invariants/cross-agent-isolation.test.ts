/**
 * INVARIANT: Agents cannot access other agents' submissions.
 *
 * REQUIREMENTS.md:143 non-negotiable:
 *   "No agent ever accesses another agent's output or data."
 *
 * The submission detail route at /api/v1/submissions/[id] is the primary
 * endpoint this rule protects — it's the agent's scoring+feedback view.
 * If another agent can read it, the whole isolation guarantee falls apart.
 *
 * This is a response-layer regression test. RLS would be the deeper defense
 * (see [[service-role-audit]]), but that work is deferred.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockAgentUser,
  makeGetRequest,
  parseJsonResponse,
} from "@/test/api-test-helpers";
import type { AuthenticatedUser } from "@/lib/auth-unified";

let mockUser: AuthenticatedUser | null = null;

vi.mock("@/lib/auth-unified", () => ({
  authenticateRequest: vi.fn(() => Promise.resolve(mockUser)),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitResponse: vi.fn(() => null),
}));

const callCounters: Record<string, number> = {};
const mockResultsByTable: Record<string, Array<{ data: unknown; error: unknown }>> = {};

function pushMockResult(table: string, result: { data: unknown; error: unknown }) {
  if (!mockResultsByTable[table]) mockResultsByTable[table] = [];
  mockResultsByTable[table].push(result);
}

function nextMockResult(table: string): { data: unknown; error: unknown } {
  const idx = callCounters[table] ?? 0;
  callCounters[table] = idx + 1;
  return (mockResultsByTable[table] ?? [])[idx] ?? { data: null, error: null };
}

function createTableChain(tableName: string) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "neq", "order", "limit", "gt", "lt", "in", "or", "is", "update", "insert", "delete"]) {
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
  })),
}));

const { GET: getSubmission } = await import("@/app/api/v1/submissions/[id]/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(callCounters).forEach((k) => delete callCounters[k]);
  Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
});

describe("invariant: agents cannot access other agents' submissions", () => {
  it("returns 403 when caller is not the submission owner", async () => {
    mockUser = mockAgentUser(); // caller has supabaseId = UUID.agent1

    // The submission belongs to a DIFFERENT agent
    pushMockResult("submissions", {
      data: {
        id: UUID.submission1,
        task_id: UUID.task1,
        agent_id: "some-other-agent-uuid",
        status: "completed",
        mode: "upload",
        agent_display_name: "Someone Else",
        output_url: "submissions/foo/",
        error_message: null,
        started_at: null,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      error: null,
    });

    const req = makeGetRequest(`http://localhost/api/v1/submissions/${UUID.submission1}`);
    const res = await getSubmission(req, makeParams(UUID.submission1));

    expect(res.status).toBe(403);

    const { body } = await parseJsonResponse(res);
    // Response should NOT leak the other agent's output_url, display name, or scores
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("Someone Else");
    expect(serialized).not.toContain("submissions/foo");
    expect(serialized).not.toContain("some-other-agent-uuid");
  });

  it("returns 200 when caller IS the submission owner", async () => {
    mockUser = mockAgentUser(); // caller has supabaseId = UUID.agent1

    pushMockResult("submissions", {
      data: {
        id: UUID.submission1,
        task_id: UUID.task1,
        agent_id: UUID.agent1, // same as caller
        status: "completed",
        mode: "upload",
        agent_display_name: "My Agent",
        output_url: "submissions/my/",
        error_message: null,
        started_at: null,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      error: null,
    });
    // evaluation_results: no result yet — keep simple
    pushMockResult("evaluation_results", { data: null, error: null });
    pushMockResult("submissions", { data: null, error: null }); // for quota / ranking secondary calls

    const req = makeGetRequest(`http://localhost/api/v1/submissions/${UUID.submission1}`);
    const res = await getSubmission(req, makeParams(UUID.submission1));

    expect(res.status).toBe(200);
  });

  it("returns 401 when caller is unauthenticated", async () => {
    mockUser = null;
    const req = makeGetRequest(`http://localhost/api/v1/submissions/${UUID.submission1}`);
    const res = await getSubmission(req, makeParams(UUID.submission1));
    expect(res.status).toBe(401);
  });
});
