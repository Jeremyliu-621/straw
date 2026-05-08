import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { z } from "zod/v4";
import { authenticateRequest } from "@/lib/auth-unified";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { EVALUATION_LLM_MODEL } from "@/constants";
import { searchDocs } from "@/lib/docs-search";
import { readDocPage } from "@/lib/docs";

/**
 * POST /api/dashboard/ask
 *
 * Q&A endpoint behind the TopBar "Ask" pill. Returns
 *   { reply: string, navigate?: string | null }
 *
 * `navigate` is an in-dashboard tool action: when the user asks
 * where/how to do something, the model emits the dashboard path that
 * helps them, and the AskRail does the router.push on the client.
 *
 * Routes are an allowlist (NAV_PATHS) — even if the model hallucinates
 * an unknown URL, it gets dropped before reaching the user. Keeps
 * navigation honest.
 */

const askSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(20),
});

/** Allowlisted dashboard destinations the agent may navigate to. */
const NAV_PATHS = [
  "/dashboard",
  "/dashboard/agent",
  "/dashboard/company",
  "/dashboard/compete",
  "/dashboard/profile",
  "/dashboard/inbox",
  "/dashboard/tasks",
  "/dashboard/completed",
  "/dashboard/joined",
  "/dashboard/workspace",
  "/dashboard/api",
  "/dashboard/docs",
  "/dashboard/settings",
  "/dashboard/company/tasks",
  "/dashboard/company/submissions",
  "/dashboard/company/deals",
] as const;

const SYSTEM_PROMPT = `You are the in-dashboard assistant for Straw, a B2B
SaaS bounty board where companies post tasks and AI agents compete to solve
them. Winning agents can be hired or acquired through the platform.

Your job is to answer questions a signed-in user might have about the
Straw dashboard, the v1 API, the submission flow, the eval pipeline, and
the agent-first SDK. Be terse and concrete — short paragraphs, plain text,
never marketing copy.

You have a navigation tool. When the user asks how/where to do something
that maps to a specific dashboard page, set "navigate" to that page's path.
Only use a path from this allowlist (any other value will be ignored):
${NAV_PATHS.map((p) => `  - ${p}`).join("\n")}

If no navigation helps the answer, set "navigate" to null.

Page intents:
- /dashboard — home overview
- /dashboard/compete — browse open bounties (for agent users)
- /dashboard/joined — user's active and completed competitions
- /dashboard/profile — public agent or company profile
- /dashboard/inbox — DMs with other users
- /dashboard/api — manage API keys
- /dashboard/docs — full SDK and API documentation
- /dashboard/workspace — agent file storage
- /dashboard/settings — account + danger zone
- /dashboard/company/tasks — list of tasks the user has posted
- /dashboard/company/submissions — submissions across the user's tasks

Submission flow in one breath: every task has a rubric and an evaluator.
Submit via POST /api/v1/submissions/quick (text or base64-encoded binary).
The eval worker scores it; final_score is split per-task between
deterministic tests and an LLM judge.

Reply in plain text. No markdown headers, no emoji. Keep it under 200
words unless the user explicitly asks for more depth. When you are
navigating somewhere, do NOT also write a paragraph that says "I'll take
you there" — just answer the substantive question. The navigate field is
the navigation; the reply is the explanation.`;

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    reply: { type: SchemaType.STRING },
    navigate: { type: SchemaType.STRING, nullable: true },
  },
  required: ["reply"],
};

/**
 * Top docs hits for the user's question, with their full markdown body
 * inlined as Gemini context. Tightly scoped: top 3 hits, body capped at
 * 3000 chars each, so the system prompt stays under ~10K chars even for
 * dense pages.
 *
 * Returns an empty string when there are no hits — Gemini falls back to
 * its baseline platform knowledge from the SYSTEM_PROMPT.
 */
function buildDocsContext(query: string): { context: string; sources: Array<{ slug: string; title: string }> } {
  const hits = searchDocs(query, 3);
  if (hits.length === 0) return { context: "", sources: [] };

  const sections: string[] = [];
  const sources: Array<{ slug: string; title: string }> = [];

  for (const hit of hits) {
    const page = readDocPage(hit.slug.split("/"));
    if (!page) continue;
    const body = page.content.slice(0, 3000);
    sections.push(
      `--- DOCS: ${hit.title} (/docs/${hit.slug}) ---\n${body}`,
    );
    sources.push({ slug: hit.slug, title: hit.title });
  }

  return { context: sections.join("\n\n"), sources };
}

const gemini = new GoogleGenerativeAI(env.GOOGLE_GEMINI_API_KEY);

export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = askSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid payload", 400);
  }

  const history = parsed.data.messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  const latest = parsed.data.messages[parsed.data.messages.length - 1];
  if (latest.role !== "user") {
    return apiError("Last message must be from user", 400);
  }

  // Pre-search the docs and inline the top hits as authoritative context.
  // Agents asking "how do I set a wallet?" get the wallet doc page in
  // their system prompt, no scraping required.
  const { context: docsContext, sources: docSources } = buildDocsContext(latest.content);
  const augmentedSystemPrompt = docsContext
    ? `${SYSTEM_PROMPT}\n\n--- RELEVANT DOCS CONTEXT ---\nThe following pages from the Straw documentation are relevant to the user's question. Treat them as authoritative; quote concrete details from them when answering.\n\n${docsContext}`
    : SYSTEM_PROMPT;

  try {
    const model = gemini.getGenerativeModel({
      model: EVALUATION_LLM_MODEL,
      systemInstruction: augmentedSystemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(latest.content);
    const text = result.response.text().trim();
    if (!text) return apiError("Empty reply from model", 502);

    let parsedJson: { reply?: string; navigate?: string | null };
    try {
      parsedJson = JSON.parse(text);
    } catch {
      // Model occasionally wraps JSON in fencing despite responseSchema.
      // Strip the most common shapes and retry once.
      const stripped = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");
      parsedJson = JSON.parse(stripped);
    }

    const reply = (parsedJson.reply ?? "").trim();
    if (!reply) return apiError("Empty reply from model", 502);

    // Drop any navigate value not on the allowlist; we'd rather
    // skip a navigation than send the user somewhere unexpected.
    const rawNav = parsedJson.navigate ?? null;
    const navigate =
      rawNav && (NAV_PATHS as readonly string[]).includes(rawNav) ? rawNav : null;

    return NextResponse.json({ reply, navigate, sources: docSources });
  } catch (err) {
    console.error("[ask] gemini call failed:", err);
    return apiError("Ask failed — try again in a moment.", 502);
  }
}
