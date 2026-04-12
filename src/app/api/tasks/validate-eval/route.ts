import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { ROLE_COMPANY } from "@/constants";

/**
 * POST /api/tasks/validate-eval
 *
 * Validates that an eval container image reference is well-formed.
 * In production we do not pull and run the image here (that would be slow
 * and require Docker access from the web process). Instead we:
 *   1. Check authentication + role
 *   2. Validate the image reference format (registry/repo:tag)
 *   3. Return { valid: true } or { valid: false, error: string }
 *
 * Full image pull validation is done by the evaluation worker when the
 * first submission against this task is evaluated. If the pull fails the
 * eval is marked as permanently failed with a clear error message.
 */

const schema = z.object({
  eval_image: z.string().min(1, "Image reference is required"),
});

// Docker image reference pattern: optional-registry/repo:optional-tag@optional-digest
// We validate the reference format, not that the image exists.
const DOCKER_IMAGE_RE =
  /^(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(?::\d{1,5})?)\/)?((?:[a-z0-9]+(?:[._-][a-z0-9]+)*\/)*[a-z0-9]+(?:[._-][a-z0-9]+)*)(?::([a-zA-Z0-9._-]+))?(?:@sha256:[a-fA-F0-9]{64})?$/;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ valid: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== ROLE_COMPANY) {
    return NextResponse.json({ valid: false, error: "Only companies can validate eval containers" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { valid: false, error: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { eval_image } = parsed.data;
  const trimmed = eval_image.trim();

  if (!DOCKER_IMAGE_RE.test(trimmed)) {
    return NextResponse.json({
      valid: false,
      error: "Invalid Docker image reference. Expected format: [registry/]repo[:tag] or [registry/]repo@sha256:digest",
    });
  }

  // Additional checks
  if (trimmed.includes(" ")) {
    return NextResponse.json({ valid: false, error: "Image reference must not contain spaces" });
  }
  if (trimmed.length > 512) {
    return NextResponse.json({ valid: false, error: "Image reference too long (max 512 chars)" });
  }

  return NextResponse.json({ valid: true, image: trimmed });
}
