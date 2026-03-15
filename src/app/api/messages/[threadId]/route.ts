import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/messages/[threadId] — Get all messages in a thread.
 * Only accessible if the current user is a participant.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  const db = createServiceClient();
  const userId = session.user.supabaseId;

  // Fetch all messages in the thread
  const { data: messages, error } = await db
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  // Verify the user is a participant in this thread
  const isParticipant = (messages ?? []).some(
    (msg: { sender_id: string; recipient_id: string }) =>
      msg.sender_id === userId || msg.recipient_id === userId
  );

  if (!isParticipant && (messages ?? []).length > 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Mark unread messages as read
  const unreadIds = (messages ?? [])
    .filter(
      (msg: { recipient_id: string; read_at: string | null }) =>
        msg.recipient_id === userId && msg.read_at === null
    )
    .map((msg: { id: string }) => msg.id);

  if (unreadIds.length > 0) {
    await db
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  return NextResponse.json(messages ?? []);
}
