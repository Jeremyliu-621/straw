import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createServiceClient } from "@/lib/supabase";

const bodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(320),
  company: z.string().trim().min(1).max(200).optional().or(z.literal("").transform(() => undefined)),
  position: z.string().trim().min(1).max(200).optional().or(z.literal("").transform(() => undefined)),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }

  const db = createServiceClient();
  const { name, email, company, position } = parsed.data;

  const { data: inserted, error } = await db
    .from("waitlist")
    .insert({ name, email, company: company ?? null, position_title: position ?? null })
    .select("position")
    .single();

  if (error) {
    // 23505 = unique_violation on email — return their existing slot rather than erroring.
    if (error.code === "23505") {
      const { data: existing } = await db
        .from("waitlist")
        .select("position")
        .eq("email", email)
        .single();
      if (existing) {
        return NextResponse.json({ position: existing.position, alreadyJoined: true });
      }
    }
    console.error("[waitlist] insert failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Could not save signup" }, { status: 500 });
  }

  return NextResponse.json({ position: inserted.position, alreadyJoined: false });
}
