import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeGetRequest, mockAgentUser, UUID } from "@/test/api-test-helpers";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/auth-unified", () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitResponse: vi.fn(() => null),
}));

const mockSupabaseChain = {
  // Per-table response stores; populated by tests and consumed by `from`.
  responses: new Map<string, Array<{ filterKey?: string; filterVal?: unknown; result: unknown }>>(),
};

function setTableResponse(table: string, result: unknown, filter?: { key: string; val: unknown }) {
  if (!mockSupabaseChain.responses.has(table)) {
    mockSupabaseChain.responses.set(table, []);
  }
  mockSupabaseChain.responses.get(table)!.push({
    filterKey: filter?.key,
    filterVal: filter?.val,
    result,
  });
}

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => ({
    from: vi.fn((table: string) => makeChain(table)),
  }),
}));

interface ChainState {
  table: string;
  filters: Record<string, unknown>;
  orderColumn?: string;
  orderAsc?: boolean;
  limit?: number;
}

function makeChain(table: string) {
  const state: ChainState = { table, filters: {} };

  const passthrough = (key: string) => (col: string, val: unknown) => {
    state.filters[`${key}:${col}`] = val;
    return chain;
  };

  const chain: {
    select: (cols: string) => typeof chain;
    eq: (col: string, val: unknown) => typeof chain;
    in: (col: string, vals: unknown[]) => typeof chain;
    or: (filter: string) => typeof chain;
    order: (col: string, opts: { ascending: boolean }) => typeof chain;
    limit: (n: number) => Promise<{ data: unknown; error: null | string }>;
  } = {
    select: () => chain,
    eq: passthrough("eq") as typeof chain.eq,
    in: passthrough("in") as typeof chain.in,
    or: ((expr: string) => {
      state.filters["or"] = expr;
      return chain;
    }) as typeof chain.or,
    order: ((col: string, opts: { ascending: boolean }) => {
      state.orderColumn = col;
      state.orderAsc = opts.ascending;
      return chain;
    }) as typeof chain.order,
    limit: ((n: number) => {
      state.limit = n;
      const candidates = mockSupabaseChain.responses.get(table) ?? [];
      const match = candidates.find((c) => {
        if (!c.filterKey) return true;
        const filterEntry = Object.entries(state.filters).find(([k]) =>
          k.endsWith(`:${c.filterKey}`)
        );
        return filterEntry?.[1] === c.filterVal;
      });
      return Promise.resolve(match?.result ?? { data: [], error: null });
    }) as typeof chain.limit,
  };

  return chain;
}

// ── Imports AFTER mocks ─────────────────────────────────────────────

import { authenticateRequest } from "@/lib/auth-unified";
const { GET } = await import("./route");

const ENDPOINT = "http://localhost:3000/api/dashboard/activity";

// ── Tests ────────────────────────────────────────────────────────────

describe("GET /api/dashboard/activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseChain.responses.clear();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(null);

    const res = await GET(makeGetRequest(ENDPOINT));
    expect(res.status).toBe(401);
  });

  it("returns an empty list when the user has no activity", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(mockAgentUser());

    setTableResponse("tasks", { data: [], error: null }, { key: "company_id", val: UUID.agent1 });
    setTableResponse("submissions", { data: [], error: null });
    setTableResponse("deals", { data: [], error: null });
    setTableResponse("audit_log", { data: [], error: null });

    const res = await GET(makeGetRequest(ENDPOINT));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ events: [], count: 0 });
  });

  it("emits a created event per agent-side submission", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(mockAgentUser());

    setTableResponse("tasks", { data: [], error: null });
    setTableResponse(
      "submissions",
      {
        data: [
          {
            id: UUID.submission1,
            task_id: UUID.task1,
            status: "completed",
            created_at: "2026-05-07T10:00:00Z",
            completed_at: "2026-05-07T10:01:00Z",
            agent_id: UUID.agent1,
            agent_display_name: "Test Agent",
            tasks: { title: "Build a Markdown converter" },
            evaluation_results: null,
          },
        ],
        error: null,
      },
      { key: "agent_id", val: UUID.agent1 }
    );
    setTableResponse("deals", { data: [], error: null });
    setTableResponse("audit_log", { data: [], error: null });

    const res = await GET(makeGetRequest(ENDPOINT));
    const body = (await res.json()) as { events: Array<{ type: string; target: { title: string } }> };
    expect(res.status).toBe(200);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("submission_created");
    expect(body.events[0].target.title).toBe("Build a Markdown converter");
  });

  it("emits both created and scored events when eval result is attached", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(mockAgentUser());

    setTableResponse("tasks", { data: [], error: null });
    setTableResponse(
      "submissions",
      {
        data: [
          {
            id: UUID.submission1,
            task_id: UUID.task1,
            status: "completed",
            created_at: "2026-05-07T10:00:00Z",
            completed_at: "2026-05-07T10:01:00Z",
            agent_id: UUID.agent1,
            agent_display_name: "Test Agent",
            tasks: { title: "Markdown task" },
            evaluation_results: {
              final_score: 87.5,
              created_at: "2026-05-07T10:02:00Z",
            },
          },
        ],
        error: null,
      },
      { key: "agent_id", val: UUID.agent1 }
    );
    setTableResponse("deals", { data: [], error: null });
    setTableResponse("audit_log", { data: [], error: null });

    const res = await GET(makeGetRequest(ENDPOINT));
    const body = (await res.json()) as { events: Array<{ type: string; delta?: string }> };
    expect(body.events.map((e) => e.type).sort()).toEqual([
      "submission_created",
      "submission_scored",
    ]);
    const scored = body.events.find((e) => e.type === "submission_scored");
    expect(scored?.delta).toBe("scored 88");
  });

  it("emits an eval_failed event when status is failed", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(mockAgentUser());

    setTableResponse("tasks", { data: [], error: null });
    setTableResponse(
      "submissions",
      {
        data: [
          {
            id: UUID.submission1,
            task_id: UUID.task1,
            status: "evaluation_failed",
            created_at: "2026-05-07T10:00:00Z",
            completed_at: "2026-05-07T10:05:00Z",
            agent_id: UUID.agent1,
            agent_display_name: "Test Agent",
            tasks: { title: "Failed task" },
            evaluation_results: null,
          },
        ],
        error: null,
      },
      { key: "agent_id", val: UUID.agent1 }
    );
    setTableResponse("deals", { data: [], error: null });
    setTableResponse("audit_log", { data: [], error: null });

    const res = await GET(makeGetRequest(ENDPOINT));
    const body = (await res.json()) as { events: Array<{ type: string }> };
    const types = body.events.map((e) => e.type);
    expect(types).toContain("submission_created");
    expect(types).toContain("eval_failed");
  });

  it("emits a deal_created event with formatted dollar delta", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(mockAgentUser());

    setTableResponse("tasks", { data: [], error: null });
    setTableResponse("submissions", { data: [], error: null });
    setTableResponse(
      "deals",
      {
        data: [
          {
            id: UUID.deal1,
            task_id: UUID.task1,
            agent_id: UUID.agent1,
            company_id: UUID.user1,
            deal_type: "output_purchase",
            deal_value_cents: 50000,
            created_at: "2026-05-07T10:00:00Z",
            tasks: { title: "Won bounty" },
          },
        ],
        error: null,
      }
    );
    setTableResponse("audit_log", { data: [], error: null });

    const res = await GET(makeGetRequest(ENDPOINT));
    const body = (await res.json()) as { events: Array<{ type: string; delta?: string; target: { title: string } }> };
    const deal = body.events.find((e) => e.type === "deal_created");
    expect(deal?.delta).toBe("$500");
    expect(deal?.target.title).toBe("Won bounty");
  });

  it("respects the ?limit= query param", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(mockAgentUser());

    const subs = Array.from({ length: 10 }, (_, i) => ({
      id: `bbbb${String(i).padStart(4, "0")}-1111-4111-a111-bbbbbbbbbbbb`,
      task_id: UUID.task1,
      status: "completed",
      created_at: `2026-05-07T${String(i).padStart(2, "0")}:00:00Z`,
      completed_at: null,
      agent_id: UUID.agent1,
      agent_display_name: "Agent",
      tasks: { title: "Task" },
      evaluation_results: null,
    }));

    setTableResponse("tasks", { data: [], error: null });
    setTableResponse(
      "submissions",
      { data: subs, error: null },
      { key: "agent_id", val: UUID.agent1 }
    );
    setTableResponse("deals", { data: [], error: null });
    setTableResponse("audit_log", { data: [], error: null });

    const res = await GET(makeGetRequest(`${ENDPOINT}?limit=3`));
    const body = (await res.json()) as { events: unknown[]; count: number };
    expect(body.count).toBe(3);
    expect(body.events).toHaveLength(3);
  });

  it("sorts events descending by timestamp", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(mockAgentUser());

    setTableResponse("tasks", { data: [], error: null });
    setTableResponse(
      "submissions",
      {
        data: [
          {
            id: UUID.submission1,
            task_id: UUID.task1,
            status: "completed",
            created_at: "2026-05-07T08:00:00Z",
            completed_at: null,
            agent_id: UUID.agent1,
            agent_display_name: "Agent",
            tasks: { title: "Earlier" },
            evaluation_results: null,
          },
          {
            id: UUID.submission2,
            task_id: UUID.task2,
            status: "completed",
            created_at: "2026-05-07T11:00:00Z",
            completed_at: null,
            agent_id: UUID.agent1,
            agent_display_name: "Agent",
            tasks: { title: "Later" },
            evaluation_results: null,
          },
        ],
        error: null,
      },
      { key: "agent_id", val: UUID.agent1 }
    );
    setTableResponse("deals", { data: [], error: null });
    setTableResponse("audit_log", { data: [], error: null });

    const res = await GET(makeGetRequest(ENDPOINT));
    const body = (await res.json()) as { events: Array<{ target: { title: string } }> };
    expect(body.events[0].target.title).toBe("Later");
    expect(body.events[1].target.title).toBe("Earlier");
  });
});
