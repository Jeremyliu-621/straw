import path from "node:path";

/**
 * Reject filenames that could escape their intended directory.
 *
 * Rejects:
 *  - empty strings
 *  - names containing `/` or `\` (path separators)
 *  - names equal to "." or ".." (dot-segments)
 *  - names starting with `..` + separator (traversal prefix)
 *  - names containing null bytes (which Node APIs can't handle cleanly)
 *
 * Returns `true` only when the name is a safe single-segment filename.
 * Callers should still join against a trusted base dir, then verify via
 * `isWithin(base, joined)` — defence in depth.
 */
export function isSafeFilename(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  if (name === "." || name === "..") return false;
  if (name.includes("\0")) return false;
  if (name.includes("/") || name.includes("\\")) return false;
  return true;
}

/**
 * Resolve `name` against `baseDir` and return the resulting absolute
 * path only if it stays inside `baseDir`. Throws otherwise.
 *
 * This is the belt-and-braces guard: `isSafeFilename` catches obvious
 * path-traversal names, this catches anything that survives.
 */
export function resolveInside(baseDir: string, name: string): string {
  if (!isSafeFilename(name)) {
    throw new Error(`Unsafe filename rejected: ${JSON.stringify(name)}`);
  }
  const base = path.resolve(baseDir);
  const joined = path.resolve(base, name);
  // Append separator so "base" doesn't match "baseEvil/…".
  const basePrefix = base.endsWith(path.sep) ? base : base + path.sep;
  if (joined !== base && !joined.startsWith(basePrefix)) {
    throw new Error(
      `Path traversal attempt: ${JSON.stringify(name)} resolved outside ${JSON.stringify(baseDir)}`
    );
  }
  return joined;
}

/**
 * Return true if `candidate` is the same as `base` or a descendant.
 * Both paths are resolved to absolute form before the check.
 */
export function isWithin(base: string, candidate: string): boolean {
  const b = path.resolve(base);
  const c = path.resolve(candidate);
  if (b === c) return true;
  const bPrefix = b.endsWith(path.sep) ? b : b + path.sep;
  return c.startsWith(bPrefix);
}
