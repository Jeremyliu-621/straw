import { createServiceClient } from "@/lib/supabase";
import type { User } from "@/types/database";
import type { UserRole } from "@/constants";

interface SyncUserParams {
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  authProviderId: string;
}

/**
 * Syncs an authenticated user to the Supabase users table.
 * Creates on first login, updates name/avatar on subsequent logins.
 * Idempotent — safe to call on every sign-in.
 */
export async function syncUserToSupabase(params: SyncUserParams): Promise<User> {
  const db = createServiceClient();

  // Check if user already exists by auth provider ID
  const { data: existing, error: findError } = await db
    .from("users")
    .select("*")
    .eq("auth_provider_id", params.authProviderId)
    .single();

  if (findError && findError.code !== "PGRST116") {
    throw findError;
  }

  if (existing) {
    // Update name and avatar on each login
    const { data: updated, error: updateError } = await db
      .from("users")
      .update({
        name: params.name,
        avatar_url: params.avatarUrl,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return updated as User;
  }

  // Create new user
  const { data: created, error: createError } = await db
    .from("users")
    .insert({
      email: params.email,
      name: params.name,
      role: params.role,
      avatar_url: params.avatarUrl,
      auth_provider_id: params.authProviderId,
    })
    .select()
    .single();

  if (createError) throw createError;
  return created as User;
}
