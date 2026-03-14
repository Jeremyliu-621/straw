import type { SupabaseClient } from "@supabase/supabase-js";
import type { Deal, DealInsert } from "@/types/database";

export class DealRepository {
  constructor(private db: SupabaseClient) {}

  async findByTask(taskId: string): Promise<Deal[]> {
    const { data, error } = await this.db
      .from("deals")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as Deal[];
  }

  async findByAgent(agentId: string): Promise<Deal[]> {
    const { data, error } = await this.db
      .from("deals")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as Deal[];
  }

  async findByCompany(companyId: string): Promise<Deal[]> {
    const { data, error } = await this.db
      .from("deals")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as Deal[];
  }

  async create(deal: DealInsert): Promise<Deal> {
    const { data, error } = await this.db
      .from("deals")
      .insert(deal)
      .select()
      .single();

    if (error) throw error;
    return data as Deal;
  }
}
