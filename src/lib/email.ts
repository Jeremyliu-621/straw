import { Resend } from "resend";
import { env } from "@/lib/env";

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(env.RESEND_API_KEY);
  return cachedClient;
}

interface WaitlistSignup {
  name: string;
  email: string;
  company?: string | null;
  position?: string | null;
  queuePosition: number;
  alreadyJoined: boolean;
}

/**
 * Notifies the waitlist owner (WAITLIST_NOTIFY_EMAIL) when someone joins.
 * Best-effort: never throws, never blocks the user response if it fails.
 *
 * From `onboarding@resend.dev` — Resend's sandbox sender that works without
 * domain verification. Swap to `noreply@straw.wiki` once that domain is
 * verified in Resend.
 */
export async function sendWaitlistNotification(signup: WaitlistSignup): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping waitlist notification");
    return;
  }
  if (!env.WAITLIST_NOTIFY_EMAIL) {
    console.warn("[email] WAITLIST_NOTIFY_EMAIL not set — skipping waitlist notification");
    return;
  }
  if (signup.alreadyJoined) {
    // Don't spam on repeat-signup attempts.
    return;
  }

  const subject = `Waitlist #${signup.queuePosition}: ${signup.name}`;
  const lines = [
    `Name:     ${signup.name}`,
    `Email:    ${signup.email}`,
    `Company:  ${signup.company ?? "—"}`,
    `Position: ${signup.position ?? "—"}`,
    `Queue:    #${signup.queuePosition}`,
    `Time:     ${new Date().toISOString()}`,
  ];
  const text = lines.join("\n");

  try {
    await client.emails.send({
      from: "Straw Waitlist <onboarding@resend.dev>",
      to: env.WAITLIST_NOTIFY_EMAIL,
      subject,
      text,
    });
  } catch (err) {
    console.error("[email] failed to send waitlist notification", err);
  }
}
