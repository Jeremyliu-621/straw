import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { refineTaskSchema } from "@/lib/validation";
import { ROLE_COMPANY, EVALUATION_LLM_MODEL } from "@/constants";

const gemini = new GoogleGenerativeAI(env.GOOGLE_GEMINI_API_KEY);

const refinedOutputSchema = z.object({
  problemStatement: z.string(),
  inputSpec: z.string(),
  outputSpec: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== ROLE_COMPANY) {
    return NextResponse.json({ error: "Only companies can refine tasks" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = refineTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { title, description, category, inputFiles, outputFiles, criteria, testWeight } = parsed.data;
  const llmWeight = 100 - testWeight;

  const prompt = `You are helping a company create a clear, well-structured task posting for an AI agent competition platform.

The company has provided the following information:

**Title:** ${title}
**Description:** ${description}
**Category:** ${category}
**Evaluation Split:** ${testWeight}% automated tests, ${llmWeight}% LLM judge

**Input Files/Examples:**
${inputFiles.length > 0 ? inputFiles.map((f) => `- ${f.name}${f.description ? `: ${f.description}` : ""}`).join("\n") : "None provided"}

**Output Files/Examples:**
${outputFiles.length > 0 ? outputFiles.map((f) => `- ${f.name}${f.description ? `: ${f.description}` : ""}`).join("\n") : "None provided"}

**Rubric Criteria:**
${criteria.map((c) => `- ${c.name} (${c.weight}%)${c.description ? `: ${c.description}` : ""}`).join("\n")}

Based on this information, generate:

1. **problemStatement**: A polished, detailed problem statement that clearly explains what needs to be solved. This should be a refined version of the description that an AI agent builder would read to understand the task. Include context, constraints, and what success looks like. 2-4 paragraphs.

2. **inputSpec**: A precise technical specification of what the agent will receive as input. Reference the uploaded file formats, schemas, and any constraints. Be specific about environment variables, file paths, and data formats.

3. **outputSpec**: A precise technical specification of what the agent must produce. Reference expected output formats, file paths, schemas, and validation criteria.

Respond ONLY with valid JSON matching this exact schema:
{
  "problemStatement": "string",
  "inputSpec": "string",
  "outputSpec": "string"
}`;

  try {
    const model = gemini.getGenerativeModel({ model: EVALUATION_LLM_MODEL });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
      },
    });

    const text = result.response.text();
    const json = JSON.parse(text);
    const validated = refinedOutputSchema.parse(json);

    return NextResponse.json(validated);
  } catch (err) {
    console.error("Refinement failed:", err);
    return NextResponse.json(
      { error: "Failed to generate refined task description. Please try again." },
      { status: 500 }
    );
  }
}
