import { z } from "zod/v4";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Auth
  AUTH_SECRET: z.string().min(1),
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),

  // Redis
  REDIS_URL: z.url(),

  // Google Gemini
  GOOGLE_GEMINI_API_KEY: z.string().min(1),

  // App
  NEXT_PUBLIC_APP_URL: z.url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    console.error("Missing or invalid environment variables:\n", formatted);
    throw new Error("Environment validation failed. See above for details.");
  }

  return result.data;
}

/**
 * Validated environment variables.
 * Import this instead of accessing process.env directly.
 * In test environment, use mockEnv() from test setup instead.
 */
export const env = process.env.NODE_ENV === "test" ? ({} as Env) : validateEnv();
