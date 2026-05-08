import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { listAnnouncements } from "@/lib/announcements";

/**
 * GET /api/dashboard/notifications
 *
 * Returns the global platform-announcement feed for the TopBar bell
 * dropdown. Auth-gated (signed-in only) but content is identical for
 * every user — read state lives client-side until a product reason
 * pushes it server-side.
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const items = await listAnnouncements(20);
  return NextResponse.json({ items });
}
