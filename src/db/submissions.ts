import type { SupabaseClient } from "@supabase/supabase-js";
import type { Submission, SubmissionInsert } from "@/types/database";
import type { SubmissionStatus } from "@/constants";

export class SubmissionRepository {
  constructor(private db: SupabaseClient) {}

  async findById(id: string): Promise<Submission | null> {
    const { data, error } = await this.db
      .from("submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    return data as Submission;
  }

  async findByTask(taskId: string): Promise<Submission[]> {
    const { data, error } = await this.db
      .from("submissions")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as Submission[];
  }

  async findByAgent(agentId: string): Promise<Submission[]> {
    const { data, error } = await this.db
      .from("submissions")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as Submission[];
  }

  async findByTaskAndAgent(taskId: string, agentId: string): Promise<Submission | null> {
    const { data, error } = await this.db
      .from("submissions")
      .select("*")
      .eq("task_id", taskId)
      .eq("agent_id", agentId)
      .single();

    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    return data as Submission;
  }

  async create(submission: SubmissionInsert): Promise<Submission> {
    const { data, error } = await this.db
      .from("submissions")
      .insert(submission)
      .select()
      .single();

    if (error) throw error;
    return data as Submission;
  }

  async updateStatus(
    id: string,
    status: SubmissionStatus,
    extra?: Partial<Pick<Submission, "output_url" | "error_message" | "started_at" | "completed_at">>
  ): Promise<Submission> {
    const { data, error } = await this.db
      .from("submissions")
      .update({ status, ...extra })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Submission;
  }
}
