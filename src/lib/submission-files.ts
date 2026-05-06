/**
 * Decoding + MIME sniffing for `quick-submit` file payloads.
 *
 * History: pre-D-something we accepted ONLY `Record<string, string>` and
 * uploaded every file as UTF-8 `text/plain`. That silently corrupted any
 * binary content (model weights, images, zips, compiled artifacts) and
 * lied about Content-Type for everything else (.json, .py, etc.).
 *
 * Now we accept either:
 *   - a plain string (treated as UTF-8 text — legacy callers keep working)
 *   - `{ content, encoding?, contentType? }` (object — opt-in binary)
 *
 * Decoding is done ONCE at the route boundary; downstream code (size
 * checks, contract validation, storage upload) operates on `Buffer`s.
 */

export type SubmissionFileEntry =
  | string
  | {
      content: string;
      /** Defaults to "utf8". Use "base64" for binary content. */
      encoding?: "utf8" | "base64";
      /** Optional override. If absent we sniff from the filename extension. */
      contentType?: string;
    };

export type SubmissionFilesInput = Record<string, SubmissionFileEntry>;

export interface DecodedFile {
  buffer: Buffer;
  contentType: string;
}

export interface DecodeError {
  filename: string;
  reason: string;
}

/**
 * Conservative extension → MIME map. Anything not listed falls back to
 * `application/octet-stream` for object-form uploads. String-form uploads
 * default to `text/plain` (legacy behaviour) so we don't change the
 * Content-Type for any caller that hasn't opted into the new shape.
 */
const EXTENSION_MIME: Record<string, string> = {
  // text-y
  md: "text/markdown",
  txt: "text/plain",
  json: "application/json",
  jsonl: "application/x-jsonlines",
  yaml: "application/yaml",
  yml: "application/yaml",
  toml: "application/toml",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  cjs: "text/javascript",
  ts: "application/typescript",
  tsx: "application/typescript",
  py: "text/x-python",
  rb: "text/x-ruby",
  go: "text/x-go",
  rs: "text/x-rust",
  java: "text/x-java",
  c: "text/x-c",
  cc: "text/x-c++",
  cpp: "text/x-c++",
  h: "text/x-c",
  hpp: "text/x-c++",
  sh: "application/x-sh",
  sql: "application/sql",
  // images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  // audio/video
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  // documents
  pdf: "application/pdf",
  // archives + binaries
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
  bz2: "application/x-bzip2",
  xz: "application/x-xz",
  "7z": "application/x-7z-compressed",
  // ML weights / pickled / compiled
  pt: "application/octet-stream",
  pth: "application/octet-stream",
  pkl: "application/octet-stream",
  bin: "application/octet-stream",
  onnx: "application/octet-stream",
  safetensors: "application/octet-stream",
  wasm: "application/wasm",
  exe: "application/octet-stream",
  dll: "application/octet-stream",
  so: "application/octet-stream",
  dylib: "application/octet-stream",
};

export function sniffContentType(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1 || dot === filename.length - 1) return "application/octet-stream";
  const ext = filename.slice(dot + 1).toLowerCase();
  return EXTENSION_MIME[ext] ?? "application/octet-stream";
}

/**
 * Validate a base64 string is well-formed before decoding. Buffer.from(str, "base64")
 * silently strips non-base64 chars, which would let an attacker pass garbage and
 * have it round-trip into storage as garbled binary. Be strict at the edge.
 */
function isValidBase64(s: string): boolean {
  if (s.length === 0) return true;
  // Standard base64 alphabet (no URL-safe variant — agents should send standard).
  // Optional padding to a multiple of 4. Whitespace allowed.
  const stripped = s.replace(/\s+/g, "");
  if (stripped.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(stripped);
}

/**
 * Decode one entry from the wire format into `{ buffer, contentType }`.
 * Returns a DecodeError instead of throwing so the caller can collect
 * all errors before failing the request.
 */
export function decodeSubmissionFile(
  filename: string,
  entry: SubmissionFileEntry
): { ok: true; file: DecodedFile } | { ok: false; error: DecodeError } {
  if (typeof entry === "string") {
    return {
      ok: true,
      file: {
        buffer: Buffer.from(entry, "utf8"),
        // Legacy default — string-form callers were already getting "text/plain"
        // and we don't break them by widening to a sniffed type now. Sniffing
        // happens only for the new object-form callers.
        contentType: "text/plain",
      },
    };
  }

  if (typeof entry !== "object" || entry === null) {
    return {
      ok: false,
      error: { filename, reason: `must be a string or { content, encoding?, contentType? } object` },
    };
  }

  if (typeof entry.content !== "string") {
    return {
      ok: false,
      error: { filename, reason: `'content' field must be a string` },
    };
  }

  const encoding = entry.encoding ?? "utf8";
  if (encoding !== "utf8" && encoding !== "base64") {
    return {
      ok: false,
      error: { filename, reason: `unsupported encoding "${encoding}" — use "utf8" or "base64"` },
    };
  }

  let buffer: Buffer;
  if (encoding === "base64") {
    if (!isValidBase64(entry.content)) {
      return {
        ok: false,
        error: { filename, reason: `'content' is not valid base64` },
      };
    }
    buffer = Buffer.from(entry.content, "base64");
  } else {
    buffer = Buffer.from(entry.content, "utf8");
  }

  const contentType = entry.contentType ?? sniffContentType(filename);

  return { ok: true, file: { buffer, contentType } };
}

/**
 * Decode all entries. Returns a fully-decoded map on success, or the
 * accumulated errors on failure. Caller should map errors to a 400
 * VALIDATION_ERROR response with the per-file reasons.
 */
export function decodeSubmissionFiles(
  input: SubmissionFilesInput
): { ok: true; files: Record<string, DecodedFile> } | { ok: false; errors: DecodeError[] } {
  const out: Record<string, DecodedFile> = {};
  const errors: DecodeError[] = [];

  for (const [filename, entry] of Object.entries(input)) {
    const result = decodeSubmissionFile(filename, entry);
    if (result.ok) {
      out[filename] = result.file;
    } else {
      errors.push(result.error);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, files: out };
}
