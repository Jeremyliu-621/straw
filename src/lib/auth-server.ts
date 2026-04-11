import { createServiceClient } from "@/lib/supabase";
import type { User } from "@/types/database";
import type { UserRole } from "@/constants";

interface SyncUserParams {
  email: string;
  name: string;
  role?: UserRole | null;
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

  // Create new user — role is null until onboarding sets it (unless dev credentials provide one)
  const hasRole = !!params.role;
  const { data: created, error: createError } = await db
    .from("users")
    .insert({
      email: params.email,
      name: params.name,
      role: params.role ?? null,
      avatar_url: params.avatarUrl,
      auth_provider_id: params.authProviderId,
      onboarded: hasRole, // Dev credentials skip onboarding
    })
    .select()
    .single();

  if (createError) throw createError;

  // Dev credentials: create both profiles so role switching works
  if (hasRole) {
    await Promise.all([
      db.from("company_profiles").upsert(
        { user_id: (created as User).id, company_name: params.name },
        { onConflict: "user_id" }
      ),
      db.from("agent_builder_profiles").upsert(
        { user_id: (created as User).id, display_name: params.name, categories: [] },
        { onConflict: "user_id" }
      ),
    ]);
  }

  return created as User;
}
