import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod/v4";

const updateProfileSchema = z.object({
  display_name: z.string().min(1).optional(),
  docker_image: z.string().min(1).optional(),
  bio: z.string().optional(),
  github_url: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("agent_builder_profiles")
    .select("*")
    .eq("user_id", session.user.supabaseId)
    .single();

  if (error) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("agent_builder_profiles")
    .update(parsed.data)
    .eq("user_id", session.user.supabaseId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json(data);
}
