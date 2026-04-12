import { z } from "zod/v4";
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_DEFAULT_LIMIT,
  NOTIFICATION_MAX_LIMIT,
} from "@/constants";
import type { NotificationType } from "@/constants";
import type { NotificationInsert, NotificationPreference } from "@/types/database";

// ── Query Param Parsing ─────────────────────────────────────

export interface NotificationQueryParams {
  limit: number;
  cursor: string | null;
  unreadOnly: boolean;
}

/**
 * Parse notification list query parameters from a URL.
 */
export function parseNotificationQueryParams(url: URL): NotificationQueryParams {
  const rawLimit = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor") || null;
  const unreadOnly = url.searchParams.get("unread_only") === "true";

  let limit = NOTIFICATION_DEFAULT_LIMIT;
  if (rawLimit) {
    const parsed = parseInt(rawLimit, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, NOTIFICATION_MAX_LIMIT);
    }
  }

  return { limit, cursor, unreadOnly };
}

// ── Notification Builder ────────────────────────────────────

/**
 * Build a NotificationInsert object with all required fields.
 */
export function buildNotification(
  type: NotificationType,
  userId: string,
  resourceType: string | null,
  resourceId: string | null,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
): NotificationInsert {
  return {
    user_id: userId,
    type,
    title,
    body,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata: metadata ?? {},
  };
}

// ── Preference Validation ───────────────────────────────────

const notificationTypeValues = Object.values(NOTIFICATION_TYPE) as [
  string,
  ...string[],
];

export const notificationPreferenceSchema = z.object({
  notification_type: z.enum(notificationTypeValues),
  in_app_enabled: z.boolean(),
});

export type NotificationPreferenceInput = z.infer<
  typeof notificationPreferenceSchema
>;

// ── Read Request Validation ─────────────────────────────────

export const markReadSchema = z.union([
  z.object({ notification_ids: z.array(z.string().uuid()).min(1).max(100) }),
  z.object({ all: z.literal(true) }),
]);

export type MarkReadInput = z.infer<typeof markReadSchema>;

// ── Preference Check ────────────────────────────────────────

/**
 * Check if a user should receive a notification of the given type.
 * If no explicit preference exists, defaults to enabled.
 */
export function shouldNotify(
  preferences: NotificationPreference[],
  type: NotificationType
): boolean {
  const pref = preferences.find((p) => p.notification_type === type);
  if (!pref) return true; // default: enabled
  return pref.in_app_enabled;
}
