import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Supabase client for server-side use with service role key.
 * Bypasses RLS — use only in service/repository layer, never in client code.
 */
export function createServiceClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Supabase client for authenticated user context.
 * Respects RLS policies. Used in API routes with user's JWT.
 */
export function createUserClient(supabaseAccessToken: string) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${supabaseAccessToken}` },
    },
    auth: { persistSession: false },
  });
}
