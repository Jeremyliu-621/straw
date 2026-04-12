import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogEntry, AuditLogInsert } from "@/types/database";
import type { AuditAction } from "@/constants";
import { AUDIT_LOG_DEFAULT_LIMIT, AUDIT_LOG_MAX_LIMIT } from "@/constants";

export interface AuditLogQueryParams {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string | null;
}

export class AuditLogRepository {
  constructor(private db: SupabaseClient) {}

  async log(entry: AuditLogInsert): Promise<AuditLogEntry> {
    const { data, error } = await this.db
      .from("audit_log")
      .insert({
        user_id: entry.user_id,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        metadata: entry.metadata ?? {},
        ip_address: entry.ip_address ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AuditLogEntry;
  }

  async query(params: AuditLogQueryParams): Promise<AuditLogEntry[]> {
    const limit = Math.min(
      params.limit ?? AUDIT_LOG_DEFAULT_LIMIT,
      AUDIT_LOG_MAX_LIMIT
    );

    let query = this.db
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (params.userId) {
      query = query.eq("user_id", params.userId);
    }
    if (params.action) {
      query = query.eq("action", params.action);
    }
    if (params.resourceType) {
      query = query.eq("resource_type", params.resourceType);
    }
    if (params.resourceId) {
      query = query.eq("resource_id", params.resourceId);
    }
    if (params.from) {
      query = query.gte("created_at", params.from);
    }
    if (params.to) {
      query = query.lte("created_at", params.to);
    }
    if (params.cursor) {
      query = query.lt("created_at", params.cursor);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as AuditLogEntry[];
  }

  async getByResource(
    resourceType: string,
    resourceId: string
  ): Promise<AuditLogEntry[]> {
    const { data, error } = await this.db
      .from("audit_log")
      .select("*")
      .eq("resource_type", resourceType)
      .eq("resource_id", resourceId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as AuditLogEntry[];
  }
}
