import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/submissions/[id]/details — Get evaluation dimensions for a submission.
 * Returns the per-criterion scores and reasoning from the LLM judge.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = createServiceClient();

  // Get the evaluation result for this submission
  const { data: evalResult, error: evalError } = await db
    .from("evaluation_results")
    .select("id, llm_reasoning")
    .eq("submission_id", id)
    .single();

  if (evalError || !evalResult) {
    return NextResponse.json({ dimensions: [], reasoning: null });
  }

  // Get the evaluation dimensions with criterion details
  const { data: dimensions, error: dimError } = await db
    .from("evaluation_dimensions")
    .select(
      `
      score,
      reasoning,
      rubric_criteria (
        name,
        weight
      )
    `
    )
    .eq("evaluation_result_id", evalResult.id);

  if (dimError) {
    return NextResponse.json({ dimensions: [], reasoning: evalResult.llm_reasoning });
  }

  // Format for the frontend
  type DimensionRow = {
    score: number;
    reasoning: string | null;
    rubric_criteria: { name: string; weight: number } | null;
  };

  const formatted = (dimensions as DimensionRow[])
    .filter((d) => d.rubric_criteria !== null)
    .map((d) => ({
      criterion_name: d.rubric_criteria!.name,
      score: d.score,
      reasoning: d.reasoning,
      weight: d.rubric_criteria!.weight,
    }));

  return NextResponse.json({
    dimensions: formatted,
    reasoning: evalResult.llm_reasoning,
  });
}
