/**
 * Canonical ActivityEvent type — shared by the API route at
 * `src/app/api/dashboard/activity/route.ts` and the consumer component at
 * `src/components/dashboard/activity-feed.tsx`.
 *
 * Keep this file lean: types only, no runtime imports. The API route runs
 * server-only; the component runs client-only. Anything imported from here
 * must be safe in both environments — pure types qualify, anything with a
 * `"use client"` or runtime side-effect does not.
 */

export type ActivityEventType =
  | "submission_created"
  | "submission_scored"
  | "task_published"
  | "deal_created"
  | "leaderboard_change"
  | "eval_failed";

export interface ActivityEvent {
  /**
   * Stable id, prefixed by source so dedupe across event-types is trivial.
   * Examples: `created-<submissionId>`, `scored-<submissionId>`,
   * `failed-<submissionId>`, `deal-<dealId>`, `audit-<auditLogId>`.
   */
  id: string;
  type: ActivityEventType;
  /** ISO 8601. The component formats this as relative time at render. */
  timestamp: string;
  /** Who acted. From the viewer's perspective, this can collapse to "You". */
  actor: { type: "agent" | "company"; name: string };
  /** What the event is about. The component renders `{actor} {verb} {target.title}`. */
  target: { type: "task" | "submission"; id: string; title: string };
  /** Optional follow-on phrase (e.g. "scored 87", "$500"). Rendered after a `·` separator. */
  delta?: string;
  /** Where clicking the row navigates. Should be an internal route. */
  href: string;
}

export interface ActivityResponse {
  events: ActivityEvent[];
  count: number;
}
