import { describe, it, expect } from "vitest";
import {
  decodeSubmissionFile,
  decodeSubmissionFiles,
  sniffContentType,
} from "@/lib/submission-files";

describe("sniffContentType", () => {
  it("recognises common text extensions", () => {
    expect(sniffContentType("README.md")).toBe("text/markdown");
    expect(sniffContentType("data.json")).toBe("application/json");
    expect(sniffContentType("main.py")).toBe("text/x-python");
    expect(sniffContentType("script.sh")).toBe("application/x-sh");
  });

  it("recognises common binary extensions", () => {
    expect(sniffContentType("logo.png")).toBe("image/png");
    expect(sniffContentType("photo.JPG")).toBe("image/jpeg");
    expect(sniffContentType("model.safetensors")).toBe("application/octet-stream");
    expect(sniffContentType("dataset.tar.gz")).toBe("application/gzip");
    expect(sniffContentType("doc.pdf")).toBe("application/pdf");
  });

  it("falls back to octet-stream for unknown extensions", () => {
    expect(sniffContentType("weird.xyz")).toBe("application/octet-stream");
    expect(sniffContentType("noextension")).toBe("application/octet-stream");
    expect(sniffContentType("trailing.")).toBe("application/octet-stream");
  });

  it("is case-insensitive on the extension", () => {
    expect(sniffContentType("LOGO.PNG")).toBe("image/png");
    expect(sniffContentType("readme.MD")).toBe("text/markdown");
  });
});

describe("decodeSubmissionFile", () => {
  it("treats string entries as UTF-8 with text/plain (legacy)", () => {
    const r = decodeSubmissionFile("script.py", "print('hi')");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.file.buffer.toString("utf8")).toBe("print('hi')");
    // Legacy strings keep text/plain — we don't change the contract for
    // existing callers. Sniffing is opt-in via the object form.
    expect(r.file.contentType).toBe("text/plain");
  });

  it("decodes base64 object entries to bytes", () => {
    const png1x1 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const r = decodeSubmissionFile("logo.png", { content: png1x1, encoding: "base64" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // PNG signature
    expect(r.file.buffer[0]).toBe(0x89);
    expect(r.file.buffer[1]).toBe(0x50);
    expect(r.file.buffer[2]).toBe(0x4e);
    expect(r.file.buffer[3]).toBe(0x47);
    expect(r.file.contentType).toBe("image/png");
  });

  it("uses the explicit contentType when provided", () => {
    const r = decodeSubmissionFile("data.bin", {
      content: "aGVsbG8=",
      encoding: "base64",
      contentType: "application/x-custom",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.file.contentType).toBe("application/x-custom");
  });

  it("treats utf8-encoded object entries as text", () => {
    const r = decodeSubmissionFile("notes.md", {
      content: "# Hello",
      encoding: "utf8",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.file.buffer.toString("utf8")).toBe("# Hello");
    expect(r.file.contentType).toBe("text/markdown");
  });

  it("rejects malformed base64", () => {
    const r = decodeSubmissionFile("logo.png", { content: "not!!base64", encoding: "base64" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.reason).toContain("not valid base64");
  });

  it("rejects unsupported encoding", () => {
    const r = decodeSubmissionFile("x.txt", {
      content: "hi",
      encoding: "binary" as unknown as "utf8",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.reason).toContain("unsupported encoding");
  });

  it("rejects non-string content", () => {
    const r = decodeSubmissionFile("x.txt", {
      content: 42 as unknown as string,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.reason).toContain("must be a string");
  });

  it("rejects null entry", () => {
    const r = decodeSubmissionFile("x.txt", null as unknown as string);
    expect(r.ok).toBe(false);
  });
});

describe("decodeSubmissionFiles", () => {
  it("decodes a mixed string + object map", () => {
    const r = decodeSubmissionFiles({
      "README.md": "# Hi",
      "logo.png": {
        content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        encoding: "base64",
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.files["README.md"].buffer.toString("utf8")).toBe("# Hi");
    expect(r.files["README.md"].contentType).toBe("text/plain"); // legacy string
    expect(r.files["logo.png"].contentType).toBe("image/png");
    expect(r.files["logo.png"].buffer[0]).toBe(0x89); // PNG sig
  });

  it("collects all errors when several files fail", () => {
    const r = decodeSubmissionFiles({
      "good.md": "ok",
      "bad1.png": { content: "not!!base64!", encoding: "base64" },
      "bad2.png": { content: "also#not#base64", encoding: "base64" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toHaveLength(2);
    expect(r.errors.map((e) => e.filename).sort()).toEqual(["bad1.png", "bad2.png"]);
  });

  it("decoded byte length matches original (not base64 inflation)", () => {
    // "hello world" is 11 bytes raw / ~16 bytes base64
    const b64 = Buffer.from("hello world", "utf8").toString("base64");
    const r = decodeSubmissionFiles({
      "hi.txt": { content: b64, encoding: "base64" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.files["hi.txt"].buffer.byteLength).toBe(11);
  });
});
