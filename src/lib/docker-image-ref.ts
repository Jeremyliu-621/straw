/**
 * Lightweight validation for Docker image references.
 *
 * Full RFC-compliant parsing of Docker's reference grammar is a swamp
 * (localhost:5000/foo/bar:v1@sha256:... etc). For our purposes we just
 * need to reject strings that are obviously not image refs — typos,
 * shell-metacharacter injection, null bytes, whitespace, or things
 * that exceed a reasonable length.
 *
 * The eval worker calls `dockerode.pull(image, ...)`. Dockerode passes
 * the string to Docker's own parser; an invalid ref will be rejected
 * there too. Our job is to keep junk from even getting that far, and
 * to give a useful error log when something's off.
 */

const REF_MAX_LENGTH = 512;

// Coarse shape: allow letters, digits, dot, underscore, dash, slash,
// colon, at-sign. The Docker reference grammar is a subset of this;
// we rely on `docker.pull` to do the strict validation.
const COARSE_SHAPE = /^[a-zA-Z0-9._\-:/@]+$/;

const DIGEST_SUFFIX = /@sha256:[a-fA-F0-9]{64}$/;

const SHELL_METAS = /[\s;&|`$<>(){}\\]/;

/**
 * Returns `null` if the image reference looks acceptable, otherwise
 * a short human-readable reason for the rejection.
 */
export function validateImageReference(image: string): string | null {
  if (typeof image !== "string" || image.length === 0) {
    return "empty image reference";
  }
  if (image.length > REF_MAX_LENGTH) {
    return `image reference exceeds ${REF_MAX_LENGTH} characters`;
  }
  if (image.includes("\0")) {
    return "image reference contains null byte";
  }
  if (SHELL_METAS.test(image)) {
    return "image reference contains whitespace or shell metacharacters";
  }
  if (!COARSE_SHAPE.test(image)) {
    return "image reference has unexpected characters";
  }
  return null;
}

/**
 * True if the reference pins a digest (`image@sha256:HEX`). Digest
 * pins are tamper-resistant; tag-only refs (`:latest`) can have their
 * content swapped by whoever controls the registry.
 */
export function imageUsesDigest(image: string): boolean {
  return DIGEST_SUFFIX.test(image);
}
