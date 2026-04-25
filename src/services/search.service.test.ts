import { describe, it, expect, vi } from "vitest";
import { searchTasks } from "./search.service";

interface MockTaskRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  budget_cents: number;
  deadline: string;
  eval_mode: string;
  created_at: string;
}

function makeMockDb(rows: MockTaskRow[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function chain(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = {};
    for (const m of ["select", "eq", "in", "lt", "limit", "order", "textSearch"]) {
      c[m] = vi.fn(() => c);
    }
    c.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve);
    return c;
  }
  return { from: vi.fn(() => chain()) } as unknown as Parameters<typeof searchTasks>[0];
}

function row(id: string, overrides: Partial<MockTaskRow> = {}): MockTaskRow {
  return {
    id,
    title: `Task ${id}`,
    description: "x",
    category: "code-generation",
    status: "open",
    budget_cents: 50_000,
    deadline: "2026-05-01T00:00:00Z",
    eval_mode: "llm",
    created_at: "2026-04-25T00:00:00Z",
    ...overrides,
  };
}

describe("searchTasks", () => {
  it("rejects empty query", async () => {
    const db = makeMockDb([]);
    const r = await searchTasks(db, { query: "  " });
    expect("kind" in r && r.kind).toBe("invalid_query");
  });

  it("rejects oversize query", async () => {
    const db = makeMockDb([]);
    const r = await searchTasks(db, { query: "a".repeat(501) });
    expect("kind" in r && r.kind).toBe("invalid_query");
  });

  it("returns hits and pagination shape", async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      row(`id-${i}`, { created_at: new Date(2026, 0, 25 - i).toISOString() })
    );
    const db = makeMockDb(rows);
    const r = await searchTasks(db, { query: "rust", limit: 3 });
    expect("kind" in r).toBe(false);
    if (!("kind" in r)) {
      expect(r.data.length).toBe(3);
      expect(r.has_more).toBe(true);
      expect(r.next_cursor).toContain("|");
      expect(r.next_cursor).toContain(r.data[2].id);
    }
  });

  it("returns has_more=false when results fit in one page", async () => {
    const db = makeMockDb([row("only")]);
    const r = await searchTasks(db, { query: "x", limit: 20 });
    expect("kind" in r).toBe(false);
    if (!("kind" in r)) {
      expect(r.data.length).toBe(1);
      expect(r.has_more).toBe(false);
      expect(r.next_cursor).toBe(null);
    }
  });

  it("attaches a numeric rank to each hit", async () => {
    const db = makeMockDb([row("a"), row("b")]);
    const r = await searchTasks(db, { query: "x" });
    expect("kind" in r).toBe(false);
    if (!("kind" in r)) {
      expect(r.data.every((h) => typeof h.rank === "number")).toBe(true);
    }
  });
});
