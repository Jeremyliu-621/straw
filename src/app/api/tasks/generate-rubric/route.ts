import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { EVALUATION_LLM_MODEL } from "@/constants";

const gemini = new GoogleGenerativeAI(env.GOOGLE_GEMINI_API_KEY);

const requestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
});

const criterionSchema = z.object({
  name: z.string(),
  description: z.string(),
  weight: z.number().int().min(1).max(100),
});

const responseSchema = z.object({
  criteria: z.array(criterionSchema).min(2).max(8),
});

/**
 * POST /api/tasks/generate-rubric — AI-generate rubric criteria from task info.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Title, description, and category are required" }, { status: 400 });
  }

  const { title, description, category } = parsed.data;

  const prompt = `You are helping someone create evaluation criteria for an AI agent competition.

The task:
- Title: ${title}
- Category: ${category}
- Description: ${description}

Generate 3-5 rubric criteria that an LLM judge should use to score submissions. Each criterion needs:
- name: short label (e.g. "Correctness", "Performance", "Error Handling")
- description: 1-2 sentences explaining what the judge should look for
- weight: percentage (all weights must sum to exactly 100)

Choose criteria that are specific to THIS task, not generic. If the task is about building a parser, include criteria about parsing edge cases. If it's about an API, include criteria about endpoint design.

Respond ONLY with valid JSON:
{
  "criteria": [
    { "name": "string", "description": "string", "weight": number }
  ]
}`;

  try {
    const model = gemini.getGenerativeModel({ model: EVALUATION_LLM_MODEL });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
      },
    });

    const text = result.response.text();
    const json = JSON.parse(text);
    const validated = responseSchema.parse(json);

    // Ensure weights sum to 100
    const totalWeight = validated.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight !== 100) {
      // Adjust last criterion to make it sum to 100
      const diff = 100 - totalWeight;
      validated.criteria[validated.criteria.length - 1].weight += diff;
    }

    return NextResponse.json(validated);
  } catch (err) {
    console.error("Rubric generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate rubric. Please try again." },
      { status: 500 }
    );
  }
}
