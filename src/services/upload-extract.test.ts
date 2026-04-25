import { describe, it, expect, vi } from "vitest";
import AdmZip from "adm-zip";
import { extractAgentOutputZip, __upload_testing__ } from "./upload.service";

const { isZipMagic, isSafeRelativePath, isArchiveNoise, findCommonRootPrefix } = __upload_testing__;

/**
 * Unit tests for the D29 zip-extraction helper.
 *
 * The presigned-URL upload flow stores the artifact as a single
 * `agent_output` blob; without extraction the verifier + eval worker
 * silently fail because they expect loose files. Real daemon hit this
 * 2026-04-25.
 */

interface MockState {
  agentOutputBuffer?: Buffer | null;
  uploadCalls: Array<{ path: string; bytes: number }>;
  removeCalls: Array<string[]>;
  uploadShouldFail?: string;
  removeShouldFail?: boolean;
  downloadShouldFail?: string;
}

function makeMockDb(state: MockState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage: any = {
    from: vi.fn(() => ({
      download: vi.fn(async (path: string) => {
        if (state.downloadShouldFail) {
          return { data: null, error: { message: state.downloadShouldFail } };
        }
        if (path !== `submissions/sub-1/agent_output`) {
          return { data: null, error: { message: "wrong path" } };
        }
        if (!state.agentOutputBuffer) {
          return { data: null, error: { message: "not found" } };
        }
        const buf = state.agentOutputBuffer;
        return {
          data: {
            arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
          },
          error: null,
        };
      }),
      upload: vi.fn(async (path: string, data: Buffer | Uint8Array) => {
        if (state.uploadShouldFail) {
          return { error: { message: state.uploadShouldFail } };
        }
        state.uploadCalls.push({ path, bytes: data.length });
        return { error: null };
      }),
      remove: vi.fn(async (paths: string[]) => {
        if (state.removeShouldFail) {
          return { error: { message: "remove failed" } };
        }
        state.removeCalls.push(paths);
        return { error: null };
      }),
    })),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { storage } as any;
}

function buildZip(entries: Array<{ name: string; content: string | Buffer }>): Buffer {
  const zip = new AdmZip();
  for (const e of entries) {
    zip.addFile(e.name, typeof e.content === "string" ? Buffer.from(e.content) : e.content);
  }
  return zip.toBuffer();
}

describe("extractAgentOutputZip", () => {
  it("returns no_blob when there's no agent_output object", async () => {
    const state: MockState = { uploadCalls: [], removeCalls: [], agentOutputBuffer: null };
    const db = makeMockDb(state);
    const r = await extractAgentOutputZip(db, "sub-1");
    expect(r.kind).toBe("no_blob");
    expect(state.uploadCalls).toHaveLength(0);
  });

  it("returns not_a_zip for non-zip blobs (idempotent passthrough)", async () => {
    const state: MockState = {
      uploadCalls: [],
      removeCalls: [],
      agentOutputBuffer: Buffer.from("plain text content, not a zip"),
    };
    const db = makeMockDb(state);
    const r = await extractAgentOutputZip(db, "sub-1");
    expect(r.kind).toBe("not_a_zip");
    expect(state.uploadCalls).toHaveLength(0);
    expect(state.removeCalls).toHaveLength(0);
  });

  it("extracts a basic zip into loose files at the same dir", async () => {
    const zipBuf = buildZip([
      { name: "SUBMISSION.md", content: "# What I Built\nA cool thing\n" },
      { name: "main.py", content: "print('hello')" },
      { name: "README.md", content: "Read me." },
    ]);
    const state: MockState = {
      uploadCalls: [],
      removeCalls: [],
      agentOutputBuffer: zipBuf,
    };
    const db = makeMockDb(state);
    const r = await extractAgentOutputZip(db, "sub-1");
    expect(r.kind).toBe("extracted");
    if (r.kind !== "extracted") return;
    expect(r.files_written).toBe(3);
    const paths = state.uploadCalls.map((c) => c.path).sort();
    expect(paths).toEqual([
      "submissions/sub-1/README.md",
      "submissions/sub-1/SUBMISSION.md",
      "submissions/sub-1/main.py",
    ]);
    // Original blob removed
    expect(state.removeCalls).toEqual([[`submissions/sub-1/agent_output`]]);
  });

  // The 3 path-traversal cases below test isSafeRelativePath directly because
  // AdmZip auto-sanitizes entry names at construction time, so we can't build
  // a malicious zip through it. Production zips constructed by other tools
  // absolutely can carry these patterns and the production extract function
  // calls isSafeRelativePath on every entry.
  describe("isSafeRelativePath (defense-in-depth on entry names)", () => {
    it("rejects parent-traversal segments", () => {
      expect(isSafeRelativePath("../../etc/passwd").valueOf?.() ?? isSafeRelativePath("../../etc/passwd")).toBe(false);
      expect(isSafeRelativePath("a/../b")).toBe(false);
      expect(isSafeRelativePath("..")).toBe(false);
      expect(isSafeRelativePath("legit/../../escape")).toBe(false);
    });
    it("rejects absolute paths", () => {
      expect(isSafeRelativePath("/etc/passwd")).toBe(false);
      expect(isSafeRelativePath("/")).toBe(false);
    });
    it("rejects Windows-style backslash separators", () => {
      expect(isSafeRelativePath("..\\evil")).toBe(false);
      expect(isSafeRelativePath("nested\\path")).toBe(false);
    });
    it("rejects empty string", () => {
      expect(isSafeRelativePath("")).toBe(false);
    });
    it("accepts normal relative paths and nested dirs", () => {
      expect(isSafeRelativePath("SUBMISSION.md")).toBe(true);
      expect(isSafeRelativePath("src/main.py")).toBe(true);
      expect(isSafeRelativePath("a/b/c/d.json")).toBe(true);
      expect(isSafeRelativePath("file-with-dashes.txt")).toBe(true);
    });
    it("isZipMagic rejects non-zip buffers", () => {
      expect(isZipMagic(Buffer.from("plain text"))).toBe(false);
      expect(isZipMagic(Buffer.from(""))).toBe(false);
      expect(isZipMagic(Buffer.from([0x00, 0x00, 0x00, 0x00]))).toBe(false);
    });
    it("isZipMagic accepts valid zip headers", () => {
      // PK\x03\x04 — local file header
      expect(isZipMagic(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
      // PK\x05\x06 — empty archive
      expect(isZipMagic(Buffer.from([0x50, 0x4b, 0x05, 0x06]))).toBe(true);
      // PK\x07\x08 — spanned archive
      expect(isZipMagic(Buffer.from([0x50, 0x4b, 0x07, 0x08]))).toBe(true);
    });
  });

  it("preserves nested-directory zip structure", async () => {
    const zipBuf = buildZip([
      { name: "src/main.py", content: "x" },
      { name: "src/utils/helper.py", content: "y" },
      { name: "SUBMISSION.md", content: "z" },
    ]);
    const state: MockState = {
      uploadCalls: [],
      removeCalls: [],
      agentOutputBuffer: zipBuf,
    };
    const db = makeMockDb(state);
    const r = await extractAgentOutputZip(db, "sub-1");
    expect(r.kind).toBe("extracted");
    const paths = state.uploadCalls.map((c) => c.path).sort();
    expect(paths).toEqual([
      "submissions/sub-1/SUBMISSION.md",
      "submissions/sub-1/src/main.py",
      "submissions/sub-1/src/utils/helper.py",
    ]);
  });

  it("returns storage_error when an entry upload fails partway", async () => {
    const zipBuf = buildZip([
      { name: "SUBMISSION.md", content: "x" },
      { name: "main.py", content: "y" },
    ]);
    const state: MockState = {
      uploadCalls: [],
      removeCalls: [],
      agentOutputBuffer: zipBuf,
      uploadShouldFail: "bucket quota exceeded",
    };
    const db = makeMockDb(state);
    const r = await extractAgentOutputZip(db, "sub-1");
    expect(r.kind).toBe("storage_error");
    if (r.kind !== "storage_error") return;
    expect(r.reason).toContain("bucket quota exceeded");
    // Did NOT delete the original blob — daemon can retry against the
    // same artifact rather than re-uploading.
    expect(state.removeCalls).toHaveLength(0);
  });

  it("succeeds even if the post-extract cleanup remove() fails", async () => {
    const zipBuf = buildZip([{ name: "SUBMISSION.md", content: "x" }]);
    const state: MockState = {
      uploadCalls: [],
      removeCalls: [],
      agentOutputBuffer: zipBuf,
      removeShouldFail: true,
    };
    const db = makeMockDb(state);
    const r = await extractAgentOutputZip(db, "sub-1");
    // Extraction itself succeeded; cleanup soft-failure is logged but
    // doesn't fail the whole operation.
    expect(r.kind).toBe("extracted");
    if (r.kind !== "extracted") return;
    expect(r.files_written).toBe(1);
  });

  // Real-daemon audit (2026-04-25): "right-clicked a folder and zipped it"
  // case — SUBMISSION.md only existed under `myproj/`, not at the root.
  // Auto-strip the common root prefix so verifier sees loose files.
  it("auto-strips a single common root directory (right-click-zip case)", async () => {
    const zipBuf = buildZip([
      { name: "myproj/SUBMISSION.md", content: "# What I Built\n" },
      { name: "myproj/main.py", content: "print('hi')" },
      { name: "myproj/src/util.py", content: "x" },
    ]);
    const state: MockState = {
      uploadCalls: [],
      removeCalls: [],
      agentOutputBuffer: zipBuf,
    };
    const db = makeMockDb(state);
    const r = await extractAgentOutputZip(db, "sub-1");
    expect(r.kind).toBe("extracted");
    const paths = state.uploadCalls.map((c) => c.path).sort();
    expect(paths).toEqual([
      "submissions/sub-1/SUBMISSION.md",
      "submissions/sub-1/main.py",
      "submissions/sub-1/src/util.py",
    ]);
  });

  it("does NOT strip when entries don't share a single root", async () => {
    const zipBuf = buildZip([
      { name: "SUBMISSION.md", content: "x" },
      { name: "src/main.py", content: "y" },
      { name: "tests/test_main.py", content: "z" },
    ]);
    const state: MockState = {
      uploadCalls: [],
      removeCalls: [],
      agentOutputBuffer: zipBuf,
    };
    const db = makeMockDb(state);
    const r = await extractAgentOutputZip(db, "sub-1");
    expect(r.kind).toBe("extracted");
    const paths = state.uploadCalls.map((c) => c.path).sort();
    expect(paths).toEqual([
      "submissions/sub-1/SUBMISSION.md",
      "submissions/sub-1/src/main.py",
      "submissions/sub-1/tests/test_main.py",
    ]);
  });

  it("ignores macOS __MACOSX/.DS_Store noise when computing common root", async () => {
    const zipBuf = buildZip([
      { name: "__MACOSX/myproj/._SUBMISSION.md", content: "macos resource fork garbage" },
      { name: "myproj/SUBMISSION.md", content: "# real content" },
      { name: "myproj/main.py", content: "x" },
      { name: ".DS_Store", content: "ds_store garbage" },
    ]);
    const state: MockState = {
      uploadCalls: [],
      removeCalls: [],
      agentOutputBuffer: zipBuf,
    };
    const db = makeMockDb(state);
    const r = await extractAgentOutputZip(db, "sub-1");
    expect(r.kind).toBe("extracted");
    const paths = state.uploadCalls.map((c) => c.path).sort();
    expect(paths).toEqual([
      "submissions/sub-1/SUBMISSION.md",
      "submissions/sub-1/main.py",
    ]);
  });

  describe("findCommonRootPrefix", () => {
    it("returns the prefix when all entries share one", () => {
      expect(findCommonRootPrefix(["myproj/a.py", "myproj/b.py", "myproj/sub/c.py"])).toBe("myproj/");
    });
    it("returns null on empty list", () => {
      expect(findCommonRootPrefix([])).toBeNull();
    });
    it("returns null when even one entry is at the root", () => {
      expect(findCommonRootPrefix(["SUBMISSION.md", "myproj/a.py"])).toBeNull();
    });
    it("returns null when entries have different top-level dirs", () => {
      expect(findCommonRootPrefix(["src/a.py", "tests/b.py"])).toBeNull();
    });
    it("returns null when first entry has no slash", () => {
      expect(findCommonRootPrefix(["SUBMISSION.md"])).toBeNull();
    });
  });

  describe("isArchiveNoise", () => {
    it("matches __MACOSX directories at root and nested", () => {
      expect(isArchiveNoise("__MACOSX/foo")).toBe(true);
      expect(isArchiveNoise("myproj/__MACOSX/bar")).toBe(true);
    });
    it("matches .DS_Store and Thumbs.db files anywhere", () => {
      expect(isArchiveNoise(".DS_Store")).toBe(true);
      expect(isArchiveNoise("nested/.DS_Store")).toBe(true);
      expect(isArchiveNoise("Thumbs.db")).toBe(true);
    });
    it("does not match normal files", () => {
      expect(isArchiveNoise("SUBMISSION.md")).toBe(false);
      expect(isArchiveNoise("src/main.py")).toBe(false);
    });
  });

  it("handles empty zip (zero entries) without crashing", async () => {
    const zip = new AdmZip();
    const state: MockState = {
      uploadCalls: [],
      removeCalls: [],
      agentOutputBuffer: zip.toBuffer(),
    };
    const db = makeMockDb(state);
    const r = await extractAgentOutputZip(db, "sub-1");
    // Empty archive starts with PK\x05\x06 — still a zip per magic, so
    // we attempt extraction and write zero files. Original blob removed.
    expect(["extracted", "not_a_zip"]).toContain(r.kind);
  });
});
