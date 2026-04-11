import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskInvitation, TaskInvitationInsert } from "@/types/database";
import type { InvitationStatus } from "@/constants";

export class TaskInvitationRepository {
  constructor(private db: SupabaseClient) {}

  async findByTask(
    taskId: string,
    limit = 50,
    cursor?: string
  ): Promise<TaskInvitation[]> {
    let query = this.db
      .from("task_invitations")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as TaskInvitation[];
  }

  async findByAgent(
    agentId: string,
    status?: InvitationStatus,
    limit = 50,
    cursor?: string
  ): Promise<TaskInvitation[]> {
    let query = this.db
      .from("task_invitations")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as TaskInvitation[];
  }

  async findByTaskAndAgent(
    taskId: string,
    agentId: string
  ): Promise<TaskInvitation | null> {
    const { data, error } = await this.db
      .from("task_invitations")
      .select("*")
      .eq("task_id", taskId)
      .eq("agent_id", agentId)
      .single();

    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    return data as TaskInvitation;
  }

  async findById(id: string): Promise<TaskInvitation | null> {
    const { data, error } = await this.db
      .from("task_invitations")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    return data as TaskInvitation;
  }

  async create(invitation: TaskInvitationInsert): Promise<TaskInvitation> {
    const { data, error } = await this.db
      .from("task_invitations")
      .insert(invitation)
      .select()
      .single();

    if (error) throw error;
    return data as TaskInvitation;
  }

  async respond(
    id: string,
    agentId: string,
    status: "accepted" | "declined"
  ): Promise<TaskInvitation> {
    const { data, error } = await this.db
      .from("task_invitations")
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("agent_id", agentId)
      .select()
      .single();

    if (error) throw error;
    return data as TaskInvitation;
  }

  async countByTask(taskId: string): Promise<number> {
    const { count, error } = await this.db
      .from("task_invitations")
      .select("*", { count: "exact", head: true })
      .eq("task_id", taskId);

    if (error) throw error;
    return count ?? 0;
  }

  async countPendingByAgent(agentId: string): Promise<number> {
    const { count, error } = await this.db
      .from("task_invitations")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .eq("status", "pending");

    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Expire all pending invitations for a task.
   * Called when a task closes (auto-close, deadline, or manual).
   * Returns the number of invitations expired.
   */
  async expireByTask(taskId: string): Promise<number> {
    const { data, error } = await this.db
      .from("task_invitations")
      .update({
        status: "expired",
        responded_at: new Date().toISOString(),
      })
      .eq("task_id", taskId)
      .eq("status", "pending")
      .select("id");

    if (error) throw error;
    return (data ?? []).length;
  }
}
