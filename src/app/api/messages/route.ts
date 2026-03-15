import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod/v4";
import { generateThreadId } from "@/services/results.service";

const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  body: z.string().min(1).max(5000),
});

/**
 * GET /api/messages — List message threads for the current user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const userId = session.user.supabaseId;

  // Get all messages for this user, ordered newest first
  const { data, error } = await db
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  // Deduplicate to latest message per thread
  const threadMap = new Map<string, (typeof data)[0]>();
  for (const msg of data ?? []) {
    if (!threadMap.has(msg.thread_id)) {
      threadMap.set(msg.thread_id, msg);
    }
  }

  const threads = Array.from(threadMap.values());

  return NextResponse.json(threads);
}

/**
 * POST /api/messages — Send a new message.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = sendMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { recipientId, taskId, body: messageBody } = parsed.data;
  const senderId = session.user.supabaseId;

  // Cannot message yourself
  if (recipientId === senderId) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  // Generate deterministic thread ID
  const threadId = generateThreadId(senderId, recipientId, taskId ?? "general");

  const db = createServiceClient();

  const { data: message, error } = await db
    .from("messages")
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      recipient_id: recipientId,
      task_id: taskId ?? null,
      body: messageBody,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to send message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json(message, { status: 201 });
}
