import { createServiceClient } from "@/lib/supabase";
import { hashApiKey, isValidApiKeyFormat } from "@/services/api-key.service";
import type { UserRole } from "@/constants";

/**
 * API Key authentication for programmatic access.
 *
 * Checks the Authorization header for a Bearer token in the format:
 *   Authorization: Bearer straw_sk_<hex>
 *
 * On success, returns the authenticated user's info.
 * On failure, returns null.
 *
 * Also updates the key's last_used_at timestamp (fire-and-forget).
 */
export interface ApiKeyUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  supabaseId: string;
  onboarded: boolean;
}

export async function authenticateApiKey(req: Request): Promise<ApiKeyUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  const token = parts[1];
  if (!isValidApiKeyFormat(token)) return null;

  const keyHash = hashApiKey(token);
  const db = createServiceClient();

  // Look up the key
  const { data: apiKey, error: keyError } = await db
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .single();

  if (keyError || !apiKey) return null;
  if (apiKey.revoked_at) return null;

  // Fetch the user
  const { data: user, error: userError } = await db
    .from("users")
    .select("id, email, name, role, onboarded")
    .eq("id", apiKey.user_id)
    .single();

  if (userError || !user) return null;

  // Update last_used_at (fire-and-forget — don't block the request)
  db.from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    supabaseId: user.id,
    onboarded: user.onboarded,
  };
}
