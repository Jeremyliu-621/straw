import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod/v4";
import { generateThreadId } from "@/services/results.service";
import { rateLimitResponse } from "@/lib/rate-limit";
import { parseBody } from "@/lib/api-utils";

const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  body: z.string().min(1).max(5000),
});

/**
 * GET /api/messages — List message threads for the current user.
 *
 * Each thread is represented by its latest message, plus the resolved
 * display names of the sender + recipient (joined from `users.name`)
 * and the task title if the thread is task-scoped (joined from
 * `tasks.title`). The inbox UI relies on these joined fields; without
 * them threads render as UUID-slice initials.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const userId = session.user.supabaseId;

  // Pull messages + the two user FK joins + task title in one trip.
  // The `!sender_id` / `!recipient_id` syntax disambiguates the two FKs
  // pointing at the same `users` table.
  const { data, error } = await db
    .from("messages")
    .select(
      "*, sender:users!sender_id(name), recipient:users!recipient_id(name), task:tasks(title)"
    )
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  // Deduplicate to latest message per thread, flattening the joins.
  const threadMap = new Map<string, Record<string, unknown>>();
  for (const msg of data ?? []) {
    if (threadMap.has(msg.thread_id)) continue;
    const sender = pickJoined(msg.sender) as { name?: string } | null;
    const recipient = pickJoined(msg.recipient) as { name?: string } | null;
    const task = pickJoined(msg.task) as { title?: string } | null;
    threadMap.set(msg.thread_id, {
      ...msg,
      sender_name: sender?.name ?? null,
      recipient_name: recipient?.name ?? null,
      task_title: task?.title ?? null,
      // Strip the nested join shapes so the response is flat.
      sender: undefined,
      recipient: undefined,
      task: undefined,
    });
  }

  return NextResponse.json(Array.from(threadMap.values()));
}

/** Supabase-js sometimes returns a relation as a 1-element array. Normalize. */
function pickJoined<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/**
 * POST /api/messages — Send a new message.
 */
export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req, { maxRequests: 30, prefix: "messages" });
  if (rateLimited) return rateLimited;

  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await parseBody(req);
  if ("error" in result) return result.error;
  const parsed = sendMessageSchema.safeParse(result.data);

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
