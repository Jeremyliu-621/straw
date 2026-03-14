import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { closeExpiredTask } from "@/services/task-close.service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await closeExpiredTask(id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ closed: result.closed });
}
