import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { refreshSubmissionUploadUrl } from "@/services/submission.service";

/**
 * POST /api/v1/submissions/[id]/upload-url — mint a fresh presigned upload URL
 * for a registered submission with no artifact yet.
 *
 * Per DECISIONS.md D28 (recovery for lost upload URLs). Real-daemon bug from
 * 2026-04: an agent registered a submission, lost the original URL (process
 * restart / missed it in the response / network hiccup), then got stuck —
 * `quick_submit` returned 409 "in progress" and `/complete` returned
 * NO_UPLOAD_FOUND because no artifact had been uploaded. This endpoint is
 * the recovery path: same submission, fresh URL, no quota cost, no schema
 * change.
 *
 * Eligibility checks delegated to the service. Rejects with structured
 * codes so the SDK / MCP can branch programmatically:
 *   404 NOT_FOUND          — submission doesn't exist
 *   403 FORBIDDEN          — caller is not the submission owner
 *   409 WRONG_STATUS       — submission is past `registered` (already running/completed/failed)
 *   409 ALREADY_UPLOADED   — registered AND has output_url (use /complete)
 *   409 TASK_CLOSED        — parent task already closed; resubmission needed instead
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const { id } = await params;
  const db = createServiceClient();

  const result = await refreshSubmissionUploadUrl(db, id, user.supabaseId);
  if ("kind" in result) {
    switch (result.kind) {
      case "not_found":
        return apiError("Submission not found", 404);
      case "forbidden":
        return apiError("Not your submission", 403);
      case "wrong_status":
        return apiError(
          `Cannot mint upload URL for a submission with status "${result.status}". ` +
            `Upload URLs are only available for status="registered" with no artifact yet.`,
          409,
          "WRONG_STATUS",
          { status: result.status }
        );
      case "already_uploaded":
        return apiError(
          "Submission already has an artifact uploaded. Call POST /complete to trigger evaluation.",
          409,
          "ALREADY_UPLOADED"
        );
      case "task_closed":
        return apiError(
          "Parent task is closed; this submission can no longer be uploaded against. Create a new submission on a different task.",
          409,
          "TASK_CLOSED"
        );
      case "storage_error":
        // D29: surface what Supabase Storage said. Replaces the silent 500
        // a real daemon hit on retry. Most commonly a transient Storage
        // 503 or a leftover pending upload token; usually retryable.
        return apiError(
          `Storage error minting upload URL: ${result.reason}. Retry in a moment, or delete the existing artifact and re-create the submission if persistent.`,
          502,
          "STORAGE_ERROR",
          { reason: result.reason }
        );
      default:
        return apiError("Internal error minting upload URL", 500);
    }
  }

  return NextResponse.json(result, { status: 200 });
}
