import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message, MessageInsert } from "@/types/database";

export class MessageRepository {
  constructor(private db: SupabaseClient) {}

  async findByThread(threadId: string): Promise<Message[]> {
    const { data, error } = await this.db
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as Message[];
  }

  async findThreadsForUser(userId: string): Promise<Message[]> {
    // Get the latest message per thread for the user
    const { data, error } = await this.db
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Deduplicate to latest message per thread
    const threadMap = new Map<string, Message>();
    for (const msg of (data ?? []) as Message[]) {
      if (!threadMap.has(msg.thread_id)) {
        threadMap.set(msg.thread_id, msg);
      }
    }

    return Array.from(threadMap.values());
  }

  async create(message: MessageInsert): Promise<Message> {
    const { data, error } = await this.db
      .from("messages")
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  }

  async markRead(messageId: string): Promise<void> {
    const { error } = await this.db
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", messageId);

    if (error) throw error;
  }

  async countUnread(userId: string): Promise<number> {
    const { count, error } = await this.db
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .is("read_at", null);

    if (error) throw error;
    return count ?? 0;
  }
}
