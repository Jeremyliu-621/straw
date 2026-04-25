import { describe, it, expect, vi } from "vitest";
import {
  validateKey,
  valueSizeBytes,
  setWorkspaceEntry,
  getWorkspaceEntry,
  listWorkspaceEntries,
  deleteWorkspaceEntry,
  getWorkspaceQuota,
} from "./workspace.service";
import {
  WORKSPACE_KV_MAX_KEYS_PER_AGENT,
  WORKSPACE_KV_MAX_TOTAL_BYTES_PER_AGENT,
  WORKSPACE_KV_MAX_VALUE_BYTES,
} from "@/constants";

// ── validateKey ──────────────────────────────────────────────

describe("validateKey", () => {
  it("accepts simple alphanumeric keys", () => {
    expect(validateKey("foo")).toEqual({ ok: true });
    expect(validateKey("agent_state_v1")).toEqual({ ok: true });
  });

  it("accepts namespaced keys with allowed separators", () => {
    expect(validateKey("task/12345/notes").ok).toBe(true);
    expect(validateKey("seen-tasks:2026-04-25").ok).toBe(true);
    expect(validateKey("config.timeout").ok).toBe(true);
  });

  it("rejects empty keys", () => {
    expect(validateKey("").ok).toBe(false);
  });

  it("rejects keys with disallowed characters", () => {
    expect(validateKey("foo bar").ok).toBe(false); // space
    expect(validateKey("foo!").ok).toBe(false);
    expect(validateKey("foo#bar").ok).toBe(false);
    expect(validateKey("foo?query=1").ok).toBe(false);
  });

  it("rejects keys longer than the cap", () => {
    expect(validateKey("a".repeat(201)).ok).toBe(false);
    expect(validateKey("a".repeat(200)).ok).toBe(true);
  });
});

// ── valueSizeBytes ───────────────────────────────────────────

describe("valueSizeBytes", () => {
  it("matches JSON.stringify byte length", () => {
    expect(valueSizeBytes({ a: 1 })).toBe(Buffer.byteLength(JSON.stringify({ a: 1 }), "utf8"));
  });

  it("treats null and undefined identically", () => {
    expect(valueSizeBytes(null)).toBe(valueSizeBytes(undefined));
  });
});

// ── Service surface (with mocked DB) ─────────────────────────

interface RowQuotaRow { size_bytes: number }
interface MockDBState {
  rows: Map<string, RowQuotaRow>;
  upsertResult?: { data?: unknown; error?: unknown };
  selectListData?: Array<{ key: string; size_bytes: number; created_at: string; updated_at: string }>;
}

function makeMockDb(state: MockDBState) {
  // Each from() returns a chain that records calls and yields the configured
  // result on terminal methods (.maybeSingle / .single / await).
  // Typed as `unknown` because we're emulating a fluent builder; the only
  // contract that matters is that `setWorkspaceEntry` etc. accept it as a
  // SupabaseClient.
  function chain(): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = {};
    for (const m of ["select", "eq", "lt", "limit", "order", "like", "delete", "upsert", "insert", "update"]) {
      c[m] = vi.fn(() => c);
    }
    c.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    c.single = vi.fn(() => Promise.resolve(state.upsertResult ?? { data: null, error: null }));
    // The Supabase builder is thenable — awaiting it returns the query result.
    c.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({
        data: state.selectListData ?? Array.from(state.rows.values()),
        error: null,
        count: 0,
      }).then(resolve);
    return c;
  }
  return { from: vi.fn(() => chain()) } as unknown as Parameters<typeof setWorkspaceEntry>[0];
}

describe("setWorkspaceEntry quota enforcement", () => {
  it("rejects values larger than per-value limit", async () => {
    const db = makeMockDb({ rows: new Map() });
    const huge = "x".repeat(WORKSPACE_KV_MAX_VALUE_BYTES + 100);
    const result = await setWorkspaceEntry(db, "agent-1", "k", huge);
    expect("kind" in result && result.kind).toBe("value_too_large");
  });

  it("rejects insert when key count is at cap", async () => {
    const rows = new Map<string, RowQuotaRow>();
    for (let i = 0; i < WORKSPACE_KV_MAX_KEYS_PER_AGENT; i++) {
      rows.set(String(i), { size_bytes: 10 });
    }
    const db = makeMockDb({ rows });
    const result = await setWorkspaceEntry(db, "agent-1", "newkey", { x: 1 });
    expect("kind" in result && result.kind).toBe("key_quota_exceeded");
  });

  it("rejects when total bytes would exceed cap", async () => {
    const rows = new Map<string, RowQuotaRow>();
    rows.set("a", { size_bytes: WORKSPACE_KV_MAX_TOTAL_BYTES_PER_AGENT - 100 });
    const db = makeMockDb({ rows });
    const big = "x".repeat(500);
    const result = await setWorkspaceEntry(db, "agent-1", "newkey", big);
    expect("kind" in result && result.kind).toBe("byte_quota_exceeded");
  });

  it("rejects keys that fail validation before touching the DB", async () => {
    const db = makeMockDb({ rows: new Map() });
    const result = await setWorkspaceEntry(db, "agent-1", "bad key", { x: 1 });
    expect("kind" in result && result.kind).toBe("invalid_key");
  });
});

describe("getWorkspaceEntry / deleteWorkspaceEntry validation", () => {
  it("getWorkspaceEntry rejects invalid keys", async () => {
    const db = makeMockDb({ rows: new Map() });
    const result = await getWorkspaceEntry(db, "agent-1", "");
    expect("kind" in result && result.kind).toBe("invalid_key");
  });

  it("deleteWorkspaceEntry rejects invalid keys", async () => {
    const db = makeMockDb({ rows: new Map() });
    const result = await deleteWorkspaceEntry(db, "agent-1", "bad key!");
    expect("kind" in result && result.kind).toBe("invalid_key");
  });
});

describe("listWorkspaceEntries pagination shape", () => {
  it("returns limited page + cursor when more rows exist", async () => {
    const now = Date.now();
    const data = Array.from({ length: 3 }, (_, i) => ({
      key: `k${i}`,
      size_bytes: 10,
      created_at: new Date(now - i * 1000).toISOString(),
      updated_at: new Date(now - i * 1000).toISOString(),
    }));
    const db = makeMockDb({ rows: new Map(), selectListData: data });
    const result = await listWorkspaceEntries(db, "agent-1", { limit: 2 });
    expect("kind" in result).toBe(false);
    if (!("kind" in result)) {
      expect(result.data.length).toBe(2);
      expect(result.has_more).toBe(true);
      expect(result.next_cursor).toBe(result.data[1].updated_at);
    }
  });
});

describe("getWorkspaceQuota", () => {
  it("returns sums against the configured limits", async () => {
    const data = [{ size_bytes: 100 }, { size_bytes: 200 }, { size_bytes: 300 }];
    const db = makeMockDb({ rows: new Map(), selectListData: data as never });
    const result = await getWorkspaceQuota(db, "agent-1");
    expect("kind" in result).toBe(false);
    if (!("kind" in result)) {
      expect(result.keys_used).toBe(3);
      expect(result.bytes_used).toBe(600);
      expect(result.keys_limit).toBe(WORKSPACE_KV_MAX_KEYS_PER_AGENT);
      expect(result.bytes_limit).toBe(WORKSPACE_KV_MAX_TOTAL_BYTES_PER_AGENT);
    }
  });
});
