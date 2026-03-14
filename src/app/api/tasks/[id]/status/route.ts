import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { isValidTransition } from "@/services/task.service";
import { ROLE_COMPANY, type TaskStatus } from "@/constants";
import { z } from "zod/v4";

const statusSchema = z.object({
  status: z.enum(["draft", "open", "evaluating", "closed"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== ROLE_COMPANY) {
    return NextResponse.json({ error: "Only companies can update task status" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = createServiceClient();

  // Fetch current task
  const { data: task, error: fetchError } = await db
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("company_id", session.user.supabaseId)
    .single();

  if (fetchError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const newStatus = parsed.data.status as TaskStatus;
  if (!isValidTransition(task.status as TaskStatus, newStatus)) {
    return NextResponse.json(
      {
        error: `Invalid status transition: ${task.status} → ${newStatus}`,
      },
      { status: 400 }
    );
  }

  // If publishing (draft → open), validate rubric weights sum to 100
  if (newStatus === "open") {
    const { data: criteria } = await db
      .from("rubric_criteria")
      .select("weight")
      .eq("task_id", id);

    const totalWeight = (criteria ?? []).reduce(
      (sum: number, c: { weight: number }) => sum + c.weight,
      0
    );
    if (totalWeight !== 100) {
      return NextResponse.json(
        { error: `Rubric weights sum to ${totalWeight}%, must equal 100%` },
        { status: 400 }
      );
    }
  }

  const { data: updated, error: updateError } = await db
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Failed to update task status" }, { status: 500 });
  }

  return NextResponse.json(updated);
}
