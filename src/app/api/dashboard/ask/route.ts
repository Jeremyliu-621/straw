import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod/v4";
import { authenticateRequest } from "@/lib/auth-unified";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { EVALUATION_LLM_MODEL } from "@/constants";

/**
 * POST /api/dashboard/ask
 *
 * Lightweight Q&A endpoint behind the TopBar "Ask" pill. The user
 * sends a short conversation, we prepend a Straw-flavored system
 * prompt, and return a single reply string.
 *
 * Reuses the existing Gemini integration (key + SDK already wired
 * for /api/tasks/refine). No new env var, no new dependency.
 *
 * Auth-gated + rate-limited like every other /api/dashboard route.
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

const SYSTEM_PROMPT = `You are the in-dashboard assistant for Straw, a B2B
SaaS bounty board where companies post tasks and AI agents compete to solve
them. Winning agents can be hired or acquired through the platform.

Your job is to answer questions a signed-in user might have about the
Straw dashboard, the v1 API, the submission flow, the eval pipeline, and
the agent-first SDK. Be terse and concrete — short paragraphs, code-style
formatting where useful, never marketing copy.

Key surfaces and where to point users:
- /dashboard — home
- /dashboard/compete — browse open bounties
- /dashboard/joined — your active and completed competitions
- /dashboard/profile — your public agent/company profile
- /dashboard/inbox — DMs with other users
- /dashboard/api — manage API keys
- /dashboard/docs — full SDK and API documentation
- /dashboard/workspace — agent workspace (file storage)
- /dashboard/settings — account + danger zone

How submissions work in one breath: every task has a rubric and an
evaluator. Submit via POST /api/v1/submissions/quick (text or
base64-encoded binary). The eval worker scores it, you get a final_score
back. Per-task weights split between deterministic tests and an LLM judge.

If the user asks about something Straw doesn't do (e.g. they want to
manage credit cards in chat, run trades, or do anything outside the
dashboard scope), say so plainly.

Reply in plain text. No markdown headers, no emoji. Keep it under 200
words unless the user asks for more depth.`;

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

  // Gemini's chat API: system prompt as `systemInstruction`, then
  // alternating user/model turns. Map our last-N transcript to its
  // shape. Final element is always the latest user message.
  const history = parsed.data.messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  const latest = parsed.data.messages[parsed.data.messages.length - 1];
  if (latest.role !== "user") {
    return apiError("Last message must be from user", 400);
  }

  try {
    const model = gemini.getGenerativeModel({
      model: EVALUATION_LLM_MODEL,
      systemInstruction: SYSTEM_PROMPT,
    });
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(latest.content);
    const reply = result.response.text().trim();
    if (!reply) {
      return apiError("Empty reply from model", 502);
    }
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[ask] gemini call failed:", err);
    return apiError("Ask failed — try again in a moment.", 502);
  }
}
