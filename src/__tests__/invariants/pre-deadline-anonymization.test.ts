/**
 * INVARIANT: Before a task's deadline, leaderboard entries are anonymized.
 * Real agent names and IDs are only revealed after the deadline passes.
 *
 * REQUIREMENTS.md:145-147:
 *   "Agent identities anonymized until deadline (prevents anchoring bias —
 *    companies evaluate output quality, not brand). After deadline: identities
 *    revealed..."
 *
 * Non-negotiable: "No agent ever accesses another agent's output or data."
 *
 * This test exercises the v1 leaderboard route — the one agents hit
 * programmatically — and asserts the anonymization rule at the response layer.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UUID,
  mockAgentUser,
  mockCompanyUser,
  makeGetRequest,
  parseJsonResponse,
  futureDeadline,
  pastDeadline,
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

const { GET: getV1Leaderboard } = await import("@/app/api/v1/tasks/[id]/leaderboard/route");

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(callCounters).forEach((k) => delete callCounters[k]);
  Object.keys(mockResultsByTable).forEach((k) => delete mockResultsByTable[k]);
});

describe("invariant: leaderboard anonymizes agents before deadline", () => {
  it("returns anonymized names and empty agentIds before deadline", async () => {
    mockUser = mockAgentUser();
    pushMockResult("tasks", {
      data: {
        id: UUID.task1,
        status: "open",
        deadline: futureDeadline(48),
        company_id: UUID.user1,
      },
      error: null,
    });
    pushMockResult("submissions", {
      data: [
        {
          id: UUID.submission1,
          agent_id: "real-agent-a",
          created_at: new Date().toISOString(),
          evaluation_results: { final_score: 90, test_score: null, llm_score: 90 },
        },
        {
          id: UUID.submission2,
          agent_id: "real-agent-b",
          created_at: new Date().toISOString(),
          evaluation_results: { final_score: 80, test_score: null, llm_score: 80 },
        },
      ],
      error: null,
    });

    const req = makeGetRequest(`http://localhost/api/v1/tasks/${UUID.task1}/leaderboard`);
    const res = await getV1Leaderboard(req, makeParams(UUID.task1));
    expect(res.status).toBe(200);
    const { body } = await parseJsonResponse(res);

    expect(body.revealed).toBe(false);

    const entries = (body as { entries: Array<Record<string, unknown>> }).entries ?? [];
    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      // Real agent ID must not be leaked
      expect(entry.agentId).toBe("");
      // Display name should look like "Agent N", not a real name
      expect(entry.agentName).toMatch(/^Agent\s+\d+$/);
      // Must not contain the real IDs we seeded
      expect(JSON.stringify(entry)).not.toContain("real-agent-a");
      expect(JSON.stringify(entry)).not.toContain("real-agent-b");
    }
  });

  it("reveals real agent names after deadline", async () => {
    mockUser = mockCompanyUser();
    pushMockResult("tasks", {
      data: {
        id: UUID.task1,
        status: "closed",
        deadline: pastDeadline(2),
        company_id: UUID.user1,
      },
      error: null,
    });
    pushMockResult("submissions", {
      data: [
        {
          id: UUID.submission1,
          agent_id: "real-agent-a",
          created_at: new Date().toISOString(),
          evaluation_results: { final_score: 90, test_score: null, llm_score: 90 },
        },
      ],
      error: null,
    });
    // After deadline the route fetches agent_builder_profiles for the display name
    pushMockResult("agent_builder_profiles", {
      data: { display_name: "Revealed Builder" },
      error: null,
    });

    const req = makeGetRequest(`http://localhost/api/v1/tasks/${UUID.task1}/leaderboard`);
    const res = await getV1Leaderboard(req, makeParams(UUID.task1));
    expect(res.status).toBe(200);
    const { body } = await parseJsonResponse(res);

    expect(body.revealed).toBe(true);
    const entries = (body as { entries: Array<Record<string, unknown>> }).entries ?? [];
    expect(entries.length).toBeGreaterThan(0);

    // At least one entry carries the revealed display name
    const hasReal = entries.some((e) => e.agentName === "Revealed Builder");
    expect(hasReal).toBe(true);

    // And the agentId is no longer blanked — it carries the real ID
    const hasRealId = entries.some((e) => e.agentId === "real-agent-a");
    expect(hasRealId).toBe(true);
  });
});
