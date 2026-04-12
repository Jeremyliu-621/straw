import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Notification,
  NotificationInsert,
  NotificationPreference,
} from "@/types/database";
import type { NotificationType } from "@/constants";

export class NotificationRepository {
  constructor(private db: SupabaseClient) {}

  /**
   * Find notifications for a user with cursor-based pagination.
   * Optionally filter to unread-only.
   */
  async findByUser(
    userId: string,
    limit: number,
    cursor: string | null,
    unreadOnly = false
  ): Promise<Notification[]> {
    let query = this.db
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as Notification[];
  }

  /**
   * Count unread notifications for a user (excludes dismissed).
   */
  async countUnread(userId: string): Promise<number> {
    const { count, error } = await this.db
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)
      .is("dismissed_at", null);

    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Mark a single notification as read. Only if the notification belongs to the user.
   */
  async markAsRead(id: string, userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .is("read_at", null)
      .select("id");

    if (error) throw error;
    return (data ?? []).length > 0;
  }

  /**
   * Mark multiple notifications as read for a user.
   */
  async markManyAsRead(ids: string[], userId: string): Promise<number> {
    const { data, error } = await this.db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids)
      .eq("user_id", userId)
      .is("read_at", null)
      .select("id");

    if (error) throw error;
    return (data ?? []).length;
  }

  /**
   * Mark all unread notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<number> {
    const { data, error } = await this.db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null)
      .select("id");

    if (error) throw error;
    return (data ?? []).length;
  }

  /**
   * Dismiss (archive) a notification. Only if it belongs to the user.
   */
  async dismiss(id: string, userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("notifications")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .is("dismissed_at", null)
      .select("id");

    if (error) throw error;
    return (data ?? []).length > 0;
  }

  /**
   * Create a single notification.
   */
  async create(data: NotificationInsert): Promise<Notification> {
    const { data: notification, error } = await this.db
      .from("notifications")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return notification as Notification;
  }

  /**
   * Create multiple notifications in a batch.
   */
  async createMany(items: NotificationInsert[]): Promise<Notification[]> {
    if (items.length === 0) return [];

    const { data, error } = await this.db
      .from("notifications")
      .insert(items)
      .select();

    if (error) throw error;
    return (data ?? []) as Notification[];
  }

  /**
   * Get all notification preferences for a user.
   */
  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    const { data, error } = await this.db
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .order("notification_type", { ascending: true });

    if (error) throw error;
    return (data ?? []) as NotificationPreference[];
  }

  /**
   * Upsert a notification preference for a user + type combo.
   */
  async upsertPreference(
    userId: string,
    type: NotificationType,
    inAppEnabled: boolean
  ): Promise<NotificationPreference> {
    const { data, error } = await this.db
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          notification_type: type,
          in_app_enabled: inAppEnabled,
        },
        { onConflict: "user_id,notification_type" }
      )
      .select()
      .single();

    if (error) throw error;
    return data as NotificationPreference;
  }
}
