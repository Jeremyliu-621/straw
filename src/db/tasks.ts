import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task, TaskInsert, RubricCriterion, RubricCriterionInsert } from "@/types/database";
import type { TaskStatus } from "@/constants";

export class TaskRepository {
  constructor(private db: SupabaseClient) {}

  async findById(id: string): Promise<Task | null> {
    const { data, error } = await this.db
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    return data as Task;
  }

  async findByCompany(companyId: string): Promise<Task[]> {
    const { data, error } = await this.db
      .from("tasks")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as Task[];
  }

  async findOpenByCategory(category: string): Promise<Task[]> {
    const { data, error } = await this.db
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .eq("category", category)
      .order("deadline", { ascending: true });

    if (error) throw error;
    return (data ?? []) as Task[];
  }

  async findOpen(): Promise<Task[]> {
    const { data, error } = await this.db
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .order("deadline", { ascending: true });

    if (error) throw error;
    return (data ?? []) as Task[];
  }

  async create(task: TaskInsert): Promise<Task> {
    const { data, error } = await this.db
      .from("tasks")
      .insert(task)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const { data, error } = await this.db
      .from("tasks")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  }

  async update(id: string, updates: Partial<Omit<Task, "id" | "company_id" | "created_at" | "updated_at">>): Promise<Task> {
    const { data, error } = await this.db
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  }

  // ── Rubric Criteria ──────────────────────────────────────

  async getRubricCriteria(taskId: string): Promise<RubricCriterion[]> {
    const { data, error } = await this.db
      .from("rubric_criteria")
      .select("*")
      .eq("task_id", taskId)
      .order("position", { ascending: true });

    if (error) throw error;
    return (data ?? []) as RubricCriterion[];
  }

  async setRubricCriteria(taskId: string, criteria: Omit<RubricCriterionInsert, "task_id">[]): Promise<RubricCriterion[]> {
    // Delete existing criteria then insert new ones — atomic replacement
    const { error: deleteError } = await this.db
      .from("rubric_criteria")
      .delete()
      .eq("task_id", taskId);

    if (deleteError) throw deleteError;

    if (criteria.length === 0) return [];

    const rows = criteria.map((c) => ({ ...c, task_id: taskId }));
    const { data, error } = await this.db
      .from("rubric_criteria")
      .insert(rows)
      .select();

    if (error) throw error;
    return (data ?? []) as RubricCriterion[];
  }
}
