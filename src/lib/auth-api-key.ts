import { createServiceClient } from "@/lib/supabase";
import { hashApiKey, isValidApiKeyFormat } from "@/services/api-key.service";
import { API_KEY_TIER, type ApiKeyTier, type UserRole } from "@/constants";

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
 *
 * D37 surfaces the key's `tier` and `operator_token_id` so route handlers
 * can apply tier-specific gates (e.g., F8: anonymous-tier submissions don't
 * count for the leaderboard until the user crosses the quality floor).
 */
export interface ApiKeyUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  supabaseId: string;
  onboarded: boolean;
  /** Which registration path minted this key. */
  tier: ApiKeyTier;
  /** Operator token id, if this is an operator-child key (D37 path B). */
  operatorTokenId: string | null;
  /** Whether the user has cleared the quality floor yet (false for fresh
   *  anonymous-tier users; true otherwise — see F8). */
  isFloorQualified: boolean;
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

  // Look up the key — now also pulls tier + operator_token_id (added by
  // migration 040).
  const { data: apiKey, error: keyError } = await db
    .from("api_keys")
    .select("id, user_id, revoked_at, tier, operator_token_id")
    .eq("key_hash", keyHash)
    .single();

  if (keyError || !apiKey) return null;
  if (apiKey.revoked_at) return null;

  // Fetch the user — pulls is_floor_qualified added by migration 040.
  const { data: user, error: userError } = await db
    .from("users")
    .select("id, email, name, role, onboarded, is_floor_qualified")
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
    tier: (apiKey.tier as ApiKeyTier | null) ?? API_KEY_TIER.VERIFIED,
    operatorTokenId: (apiKey.operator_token_id as string | null) ?? null,
    isFloorQualified: (user.is_floor_qualified as boolean | null) ?? true,
  };
}
