import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/auth-unified";
import { apiError, parseBody } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";

const FeedbackSchema = z.object({
  message: z.string().trim().min(3, "Message too short").max(4000, "Message too long"),
});

/**
 * POST /api/feedback
 *
 * Receives in-app feedback from the TopBar feedback dropdown. Forwards to
 * `FEEDBACK_WEBHOOK_URL` (Slack/Discord-compatible) when configured, and
 * always logs server-side as a fallback so nothing is dropped silently.
 */
export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;

  const result = FeedbackSchema.safeParse(parsed.data);
  if (!result.success) {
    return apiError(
      result.error.issues[0]?.message ?? "Invalid feedback payload",
      400,
      "INVALID_INPUT",
      result.error.flatten()
    );
  }

  const payload = {
    submittedAt: new Date().toISOString(),
    user: { id: user.supabaseId, email: user.email, name: user.name, role: user.role },
    message: result.data.message,
  };

  console.log("[feedback]", JSON.stringify(payload));

  const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const text = `*New Straw feedback* — ${payload.user.name} <${payload.user.email}>${payload.user.role ? ` (${payload.user.role})` : ""}\n\n${payload.message}`;
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch (err) {
      console.error("[feedback] webhook delivery failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
