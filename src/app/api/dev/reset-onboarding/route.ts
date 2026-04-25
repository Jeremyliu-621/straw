import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { assertDevEndpointEnabled } from "@/lib/dev-gate";

/**
 * POST /api/dev/reset-onboarding — Reset onboarded flag for the current user.
 *
 * Dev-only endpoint — returns 403 unless both NODE_ENV=development AND
 * ALLOW_DEV_ENDPOINTS=true.
 * After calling this, sign out and back in to re-trigger the onboarding flow.
 */
export async function POST() {
  const gated = assertDevEndpointEnabled();
  if (gated) return gated;

  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { error } = await db
    .from("users")
    .update({ onboarded: false })
    .eq("id", session.user.supabaseId);

  if (error) {
    console.error("Failed to reset onboarding:", error);
    return NextResponse.json({ error: "Failed to reset onboarding" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Sign out and back in to re-onboard" });
}
