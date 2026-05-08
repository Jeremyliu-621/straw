import { describe, it, expect, vi } from "vitest";
import {
  validatePath,
  uploadWorkspaceFile,
  getWorkspaceFileMetadata,
  deleteWorkspaceFile,
  listWorkspaceFiles,
  getWorkspaceFilesQuota,
} from "./workspace-files.service";
import {
  WORKSPACE_FILES_MAX_FILES_PER_AGENT,
  WORKSPACE_FILES_MAX_PER_FILE_BYTES,
  WORKSPACE_FILES_MAX_TOTAL_BYTES_PER_AGENT,
} from "@/constants";

// ── validatePath ─────────────────────────────────────────────

describe("validatePath", () => {
  it("accepts simple file paths", () => {
    expect(validatePath("data.json")).toEqual({ ok: true });
    expect(validatePath("compiled/agent-v3.bin").ok).toBe(true);
    expect(validatePath("scrape/2026-04-25/run-1.json").ok).toBe(true);
  });

  it("rejects empty paths", () => {
    expect(validatePath("").ok).toBe(false);
  });

  it("rejects parent traversal", () => {
    expect(validatePath("../etc/passwd").ok).toBe(false);
    expect(validatePath("dir/../escape").ok).toBe(false);
  });

  it("rejects absolute paths", () => {
    expect(validatePath("/etc/passwd").ok).toBe(false);
  });

  it("rejects disallowed characters", () => {
    expect(validatePath("data file.json").ok).toBe(false); // space
    expect(validatePath("query?x=1").ok).toBe(false);
    expect(validatePath("data#hash").ok).toBe(false);
  });

  it("rejects oversize paths", () => {
    expect(validatePath("a".repeat(513)).ok).toBe(false);
  });
});

// ── Service shape (with mocked DB + Storage) ────────────────

interface MockState {
  rows: Array<{ size_bytes: number; path?: string; content_type?: string; created_at?: string; updated_at?: string }>;
  upsertResult?: { data?: unknown; error?: unknown };
  storageUploadError?: unknown;
  storageRemoveError?: unknown;
  existingMaybe?: { size_bytes: number } | null;
}

function makeMockDb(state: MockState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function chain(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = {};
    for (const m of ["select", "eq", "lt", "limit", "order", "like", "delete", "upsert", "insert", "update"]) {
      c[m] = vi.fn(() => c);
    }
    c.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: state.existingMaybe ?? null, error: null })
    );
    c.single = vi.fn(() =>
      Promise.resolve(state.upsertResult ?? { data: null, error: null })
    );
    c.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: state.rows, error: null, count: 0 }).then(resolve);
    return c;
  }
  return {
    from: vi.fn(() => chain()),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() =>
          Promise.resolve({ error: state.storageUploadError ?? null })
        ),
        download: vi.fn(() =>
          Promise.resolve({
            data: state.storageUploadError ? null : new Blob([new Uint8Array([1, 2, 3])]),
            error: null,
          })
        ),
        remove: vi.fn(() =>
          Promise.resolve({ error: state.storageRemoveError ?? null })
        ),
      })),
    },
  } as unknown as Parameters<typeof uploadWorkspaceFile>[0];
}

describe("uploadWorkspaceFile quota enforcement", () => {
  it("rejects oversize files at the per-file cap", async () => {
    const db = makeMockDb({ rows: [] });
    const oversize = new Uint8Array(WORKSPACE_FILES_MAX_PER_FILE_BYTES + 1);
    const r = await uploadWorkspaceFile(db, "agent-1", { path: "big.bin", bytes: oversize });
    expect("kind" in r && r.kind).toBe("file_too_large");
  });

  it("rejects insert when file count is at cap", async () => {
    const rows = Array.from({ length: WORKSPACE_FILES_MAX_FILES_PER_AGENT }, () => ({ size_bytes: 100 }));
    const db = makeMockDb({ rows });
    const r = await uploadWorkspaceFile(db, "agent-1", {
      path: "newfile",
      bytes: new Uint8Array([1]),
    });
    expect("kind" in r && r.kind).toBe("file_quota_exceeded");
  });

  it("rejects when total bytes would exceed cap", async () => {
    const rows = [{ size_bytes: WORKSPACE_FILES_MAX_TOTAL_BYTES_PER_AGENT - 100 }];
    const db = makeMockDb({ rows });
    const r = await uploadWorkspaceFile(db, "agent-1", {
      path: "x",
      bytes: new Uint8Array(500),
    });
    expect("kind" in r && r.kind).toBe("byte_quota_exceeded");
  });

  it("rejects invalid paths before touching Storage", async () => {
    const db = makeMockDb({ rows: [] });
    const r = await uploadWorkspaceFile(db, "agent-1", {
      path: "../escape",
      bytes: new Uint8Array([1]),
    });
    expect("kind" in r && r.kind).toBe("invalid_path");
  });

  it("returns storage_error when Storage upload fails", async () => {
    const db = makeMockDb({ rows: [], storageUploadError: { message: "bucket missing" } });
    const r = await uploadWorkspaceFile(db, "agent-1", {
      path: "file.bin",
      bytes: new Uint8Array([1, 2, 3]),
    });
    expect("kind" in r && r.kind).toBe("storage_error");
  });

  it("scopes byte delta against existing path on overwrite", async () => {
    // Existing file is 100B; agent has 100B used. New upload is 200B.
    // After overwrite, total should be 200B (delta = +100), well under cap.
    const db = makeMockDb({
      rows: [{ size_bytes: 100 }],
      existingMaybe: { size_bytes: 100 },
      upsertResult: {
        data: {
          path: "file.bin",
          size_bytes: 200,
          content_type: "application/octet-stream",
          created_at: "2026-04-25T00:00:00Z",
          updated_at: "2026-04-25T01:00:00Z",
        },
        error: null,
      },
    });
    const r = await uploadWorkspaceFile(db, "agent-1", {
      path: "file.bin",
      bytes: new Uint8Array(200),
    });
    expect("kind" in r).toBe(false);
  });
});

describe("metadata + delete validation", () => {
  it("getWorkspaceFileMetadata rejects invalid paths", async () => {
    const db = makeMockDb({ rows: [] });
    const r = await getWorkspaceFileMetadata(db, "agent-1", "../bad");
    expect("kind" in r && r.kind).toBe("invalid_path");
  });

  it("deleteWorkspaceFile is idempotent on missing — deleted:true, was_present:false", async () => {
    const db = makeMockDb({ rows: [] });
    const r = await deleteWorkspaceFile(db, "agent-1", "missing.bin");
    expect("kind" in r).toBe(false);
    if (!("kind" in r)) {
      expect(r.deleted).toBe(true);
      expect(r.was_present).toBe(false);
    }
  });
});

describe("listWorkspaceFiles pagination shape", () => {
  it("returns limited page + cursor when more rows exist", async () => {
    const now = Date.now();
    const data = Array.from({ length: 3 }, (_, i) => ({
      path: `f${i}`,
      size_bytes: 10,
      content_type: "application/octet-stream",
      created_at: new Date(now - i * 1000).toISOString(),
      updated_at: new Date(now - i * 1000).toISOString(),
    }));
    const db = makeMockDb({ rows: data });
    const r = await listWorkspaceFiles(db, "agent-1", { limit: 2 });
    expect("kind" in r).toBe(false);
    if (!("kind" in r)) {
      expect(r.data.length).toBe(2);
      expect(r.has_more).toBe(true);
      expect(r.next_cursor).toBe(r.data[1].updated_at);
    }
  });
});

describe("getWorkspaceFilesQuota", () => {
  it("returns sums against the configured limits", async () => {
    const data = [{ size_bytes: 100 }, { size_bytes: 200 }];
    const db = makeMockDb({ rows: data });
    const r = await getWorkspaceFilesQuota(db, "agent-1");
    expect("kind" in r).toBe(false);
    if (!("kind" in r)) {
      expect(r.files_used).toBe(2);
      expect(r.bytes_used).toBe(300);
      expect(r.files_limit).toBe(WORKSPACE_FILES_MAX_FILES_PER_AGENT);
      expect(r.bytes_limit).toBe(WORKSPACE_FILES_MAX_TOTAL_BYTES_PER_AGENT);
      expect(r.per_file_byte_limit).toBe(WORKSPACE_FILES_MAX_PER_FILE_BYTES);
    }
  });
});
