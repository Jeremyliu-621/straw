import { redirect } from "next/navigation";

/**
 * Permanent redirect — the editor lives at /dashboard/profile so it
 * inherits the dashboard sidebar/shell. The public agent profile
 * remains at /agents/[id] (different concern).
 */
export default function AgentProfileRedirect(): never {
  redirect("/dashboard/profile");
}
