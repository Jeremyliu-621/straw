import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EvaluationResult,
  EvaluationResultInsert,
  EvaluationDimension,
  EvaluationDimensionInsert,
} from "@/types/database";

export class EvaluationRepository {
  constructor(private db: SupabaseClient) {}

  async findBySubmission(submissionId: string): Promise<EvaluationResult | null> {
    const { data, error } = await this.db
      .from("evaluation_results")
      .select("*")
      .eq("submission_id", submissionId)
      .single();

    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    return data as EvaluationResult;
  }

  async findByTask(taskId: string): Promise<EvaluationResult[]> {
    const { data, error } = await this.db
      .from("evaluation_results")
      .select("*, submissions!inner(task_id)")
      .eq("submissions.task_id", taskId)
      .order("final_score", { ascending: false });

    if (error) throw error;
    return (data ?? []) as EvaluationResult[];
  }

  async create(result: EvaluationResultInsert): Promise<EvaluationResult> {
    const { data, error } = await this.db
      .from("evaluation_results")
      .insert(result)
      .select()
      .single();

    if (error) throw error;
    return data as EvaluationResult;
  }

  // ── Dimensions ───────────────────────────────────────────

  async getDimensions(evaluationResultId: string): Promise<EvaluationDimension[]> {
    const { data, error } = await this.db
      .from("evaluation_dimensions")
      .select("*")
      .eq("evaluation_result_id", evaluationResultId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as EvaluationDimension[];
  }

  async createDimensions(dimensions: EvaluationDimensionInsert[]): Promise<EvaluationDimension[]> {
    if (dimensions.length === 0) return [];

    const { data, error } = await this.db
      .from("evaluation_dimensions")
      .insert(dimensions)
      .select();

    if (error) throw error;
    return (data ?? []) as EvaluationDimension[];
  }
}
