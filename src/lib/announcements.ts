import { createServiceClient } from "@/lib/supabase";

/**
 * Platform-wide announcements ("What's new" feed). One row per ship.
 *
 * Cover/href shape match the NotificationsPanel item interface so the
 * route handler can hand rows straight to the client.
 */
export type AnnouncementCover = "peach" | "lavender" | "blue" | "beige" | "coral" | "sage";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  cover: AnnouncementCover | null;
  href: string | null;
  publishedAt: string;
}

/** Most recent announcements first. Capped at `limit` (default 20). */
export async function listAnnouncements(limit = 20): Promise<Announcement[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("platform_announcements")
    .select("id, title, body, cover, href, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Surface as empty rather than 500'ing the dashboard shell over a
    // notifications failure. The bell still works, just shows "All
    // caught up" — caller can decide if they care to log.
    console.error("[announcements] list failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    cover: (row.cover ?? null) as AnnouncementCover | null,
    href: row.href ?? null,
    publishedAt: row.published_at,
  }));
}

/**
 * Idempotent upsert. Used by scripts/announce.ts so re-running the
 * publish step with the same id replaces the existing row instead of
 * erroring on the primary-key conflict.
 */
export async function publishAnnouncement(input: {
  id: string;
  title: string;
  body: string;
  cover?: AnnouncementCover;
  href?: string;
  publishedAt?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createServiceClient();
  const { error } = await db.from("platform_announcements").upsert({
    id: input.id,
    title: input.title,
    body: input.body,
    cover: input.cover ?? null,
    href: input.href ?? null,
    published_at: input.publishedAt ?? new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
