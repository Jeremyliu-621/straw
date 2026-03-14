import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod/v4";
import { ROLE_COMPANY } from "@/constants";

const companySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
});

const agentBuilderSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  bio: z.string().optional(),
  githubUrl: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const db = createServiceClient();
  const userId = session.user.supabaseId;
  const isCompany = session.user.role === ROLE_COMPANY;

  if (isCompany) {
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }

    const { error: profileError } = await db.from("company_profiles").upsert(
      {
        user_id: userId,
        company_name: parsed.data.companyName,
        industry: parsed.data.industry ?? null,
        website: parsed.data.website ?? null,
        description: parsed.data.description ?? null,
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      console.error("Failed to create company profile:", profileError);
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
    }
  } else {
    const parsed = agentBuilderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }

    const { error: profileError } = await db.from("agent_builder_profiles").upsert(
      {
        user_id: userId,
        display_name: parsed.data.displayName,
        bio: parsed.data.bio ?? null,
        github_url: parsed.data.githubUrl ?? null,
        categories: parsed.data.categories ?? [],
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      console.error("Failed to create agent builder profile:", profileError);
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
    }
  }

  // Mark user as onboarded
  const { error: updateError } = await db
    .from("users")
    .update({ onboarded: true })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to mark user as onboarded:", updateError);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
