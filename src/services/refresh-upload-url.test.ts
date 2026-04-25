import { describe, it, expect, vi } from "vitest";
import { refreshSubmissionUploadUrl } from "./submission.service";

/**
 * D30 — refreshSubmissionUploadUrl must delete any existing object at
 * `submissions/${id}/agent_output` before minting a fresh signed-upload URL,
 * because Supabase's createSignedUploadUrl rejects with "The resource
 * already exists" when the path is occupied. Real daemon hit this 2026-04-25.
 *
 * Eligibility checks happen before this delete-then-mint step, so the only
 * objects that can exist at the canonical path here are leftovers from a
 * prior successful PUT that the daemon now wants to redo.
 */

vi.mock("@/services/upload.service", async () => {
  const actual = await vi.importActual<typeof import("@/services/upload.service")>(
    "@/services/upload.service"
  );
  return {
    ...actual,
    generatePresignedUploadUrl: vi.fn(() =>
      Promise.resolve({
        signedUrl: "https://supabase.example.com/upload?token=fresh",
        token: "fresh-token",
        path: "submissions/sub-1/agent_output",
        expiresAt: "2026-04-25T20:00:00Z",
      })
    ),
  };
});

const removeCalls: Array<string[]> = [];

function makeMockDb(submission: {
  id: string;
  agent_id: string;
  task_id: string;
  status: string;
  output_url: string | null;
}, task: { status: string; deadline: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableHandlers: Record<string, () => any> = {
    submissions: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any = {};
      for (const m of ["select", "eq", "in", "lt", "limit", "order", "update", "insert", "upsert"]) {
        c[m] = vi.fn(() => c);
      }
      c.single = vi.fn(() => Promise.resolve({ data: submission, error: null }));
      c.maybeSingle = vi.fn(() => Promise.resolve({ data: submission, error: null }));
      c.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve);
      return c;
    },
    tasks: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any = {};
      for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
      c.single = vi.fn(() => Promise.resolve({ data: task, error: null }));
      c.maybeSingle = vi.fn(() => Promise.resolve({ data: task, error: null }));
      return c;
    },
  };

  return {
    from: vi.fn((name: string) => (tableHandlers[name] ?? tableHandlers.submissions)()),
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(async (paths: string[]) => {
          removeCalls.push(paths);
          return { error: null };
        }),
      })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("refreshSubmissionUploadUrl — D30 delete-then-mint", () => {
  it("deletes any existing blob at the canonical path before minting", async () => {
    removeCalls.length = 0;
    const db = makeMockDb(
      {
        id: "sub-1",
        agent_id: "agent-1",
        task_id: "task-1",
        status: "registered",
        output_url: null,
      },
      { status: "open", deadline: "2026-04-30T00:00:00Z" }
    );

    const result = await refreshSubmissionUploadUrl(db, "sub-1", "agent-1");

    // Storage.remove must have been called with the canonical path
    expect(removeCalls).toEqual([["submissions/sub-1/agent_output"]]);
    // ...and the mint then succeeded
    expect("kind" in result).toBe(false);
    if (!("kind" in result)) {
      expect(result.upload_url).toContain("signed-upload?token=fresh".replace("signed-upload", "upload"));
      expect(result.submission_id).toBe("sub-1");
    }
  });

  it("does not call remove when the submission is the wrong status", async () => {
    removeCalls.length = 0;
    const db = makeMockDb(
      {
        id: "sub-1",
        agent_id: "agent-1",
        task_id: "task-1",
        status: "completed", // disqualifies
        output_url: null,
      },
      { status: "open", deadline: "2026-04-30T00:00:00Z" }
    );

    const result = await refreshSubmissionUploadUrl(db, "sub-1", "agent-1");

    expect(removeCalls).toEqual([]);
    expect("kind" in result).toBe(true);
    if ("kind" in result) expect(result.kind).toBe("wrong_status");
  });

  it("does not call remove when caller is not the owner", async () => {
    removeCalls.length = 0;
    const db = makeMockDb(
      {
        id: "sub-1",
        agent_id: "owner-1",
        task_id: "task-1",
        status: "registered",
        output_url: null,
      },
      { status: "open", deadline: "2026-04-30T00:00:00Z" }
    );

    const result = await refreshSubmissionUploadUrl(db, "sub-1", "intruder-2");

    expect(removeCalls).toEqual([]);
    expect("kind" in result).toBe(true);
    if ("kind" in result) expect(result.kind).toBe("forbidden");
  });
});
