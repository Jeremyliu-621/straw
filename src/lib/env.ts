/**
 * Environment variable validation and type safety.
 * All env vars are validated at startup via Zod.
 * Use this module to access any environment variables.
 */

import { z } from "zod";

const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Next.js
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // NextAuth
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_GITHUB_ID: z.string().min(1),
  NEXTAUTH_GITHUB_SECRET: z.string().min(1),
  NEXTAUTH_GOOGLE_ID: z.string().min(1),
  NEXTAUTH_GOOGLE_SECRET: z.string().min(1),

  // Redis
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  // Claude API
  ANTHROPIC_API_KEY: z.string().min(1),

  // Execution
  DOCKER_HOST: z.string().optional(),
  EXECUTION_TIMEOUT_MS: z.coerce.number().default(600000), // 10 min default
  EXECUTION_MEMORY_LIMIT_MB: z.coerce.number().default(2048),

  // Evaluation
  EVALUATION_BATCH_SIZE: z.coerce.number().default(5),

  // Feature flags
  ENABLE_REALTIME: z.string().default("true").transform((v) => v === "true"),
});

type Environment = z.infer<typeof envSchema>;

let cachedEnv: Environment | null = null;

function validateEnv(): Environment {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors
        .map((e) => `${e.path.join(".")} (${e.message})`)
        .join("\n  ");
      console.error("Invalid environment variables:\n  " + missing);
      // Only call process.exit in Node.js context (not Edge Runtime)
      if (typeof process !== "undefined" && process.exit) {
        process.exit(1);
      }
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 * Caches on first access to avoid re-validation
 */
export function getEnv(): Environment {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

// Lazy-loaded env object for convenience
export const env = new Proxy({} as Environment, {
  get: (_, prop: string | symbol) => {
    const validated = getEnv();
    return validated[prop as keyof Environment];
  },
});
