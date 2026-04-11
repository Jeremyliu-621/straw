import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod/v4";
import { ROLE_COMPANY, ROLE_AGENT_BUILDER } from "@/constants";
import type { UserRole } from "@/constants";

const onboardingSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  role: z.enum([ROLE_COMPANY, ROLE_AGENT_BUILDER]).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  const db = createServiceClient();
  const userId = session.user.supabaseId;
  const { displayName, role: requestedRole } = parsed.data;

  // Create (or update) both profiles so the user can switch modes freely
  const [companyResult, agentResult] = await Promise.all([
    db.from("company_profiles").upsert(
      { user_id: userId, company_name: displayName },
      { onConflict: "user_id" }
    ),
    db.from("agent_builder_profiles").upsert(
      { user_id: userId, display_name: displayName, categories: [] },
      { onConflict: "user_id" }
    ),
  ]);

  if (companyResult.error) {
    console.error("Failed to create company profile:", companyResult.error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
  if (agentResult.error) {
    console.error("Failed to create agent profile:", agentResult.error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }

  // Use requested role or default to company; user can switch in the dashboard
  const defaultRole: UserRole = requestedRole ?? ROLE_COMPANY;

  const { error: updateError } = await db
    .from("users")
    .update({ onboarded: true, role: defaultRole })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to mark user as onboarded:", updateError);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }

  return NextResponse.json({ success: true, role: defaultRole });
}
