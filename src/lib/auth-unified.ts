import { auth } from "@/lib/auth";
import { authenticateApiKey, type ApiKeyUser } from "@/lib/auth-api-key";
import { API_KEY_TIER, type ApiKeyTier, type UserRole } from "@/constants";

/**
 * Unified authentication — tries session auth first, then API key auth.
 *
 * Use this in API routes that should accept both authenticated sessions (web UI)
 * and API key Bearer tokens (programmatic access).
 *
 * Returns a normalized user object or null if unauthenticated.
 *
 * D37: API-key callers carry a `tier` (which registration path minted them)
 * and `isFloorQualified` (whether their submissions count for the leaderboard).
 * Session callers are always tier='verified' and floor-qualified — they came
 * through human OAuth.
 */
export interface AuthenticatedUser {
  supabaseId: string;
  email: string;
  name: string;
  role: UserRole | null;
  onboarded: boolean;
  authMethod: "session" | "api_key";
  tier: ApiKeyTier;
  operatorTokenId: string | null;
  isFloorQualified: boolean;
}

export async function authenticateRequest(req: Request): Promise<AuthenticatedUser | null> {
  // 1. Try session auth (NextAuth)
  const session = await auth();
  if (session?.user?.supabaseId) {
    return {
      supabaseId: session.user.supabaseId,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      onboarded: session.user.onboarded,
      authMethod: "session",
      tier: API_KEY_TIER.VERIFIED,
      operatorTokenId: null,
      isFloorQualified: true,
    };
  }

  // 2. Try API key auth
  const apiKeyUser = await authenticateApiKey(req);
  if (apiKeyUser) {
    return {
      supabaseId: apiKeyUser.supabaseId,
      email: apiKeyUser.email,
      name: apiKeyUser.name,
      role: apiKeyUser.role,
      onboarded: apiKeyUser.onboarded,
      authMethod: "api_key",
      tier: apiKeyUser.tier,
      operatorTokenId: apiKeyUser.operatorTokenId,
      isFloorQualified: apiKeyUser.isFloorQualified,
    };
  }

  return null;
}
