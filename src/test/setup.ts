import { vi } from "vitest";

// Mock environment variables for tests
vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
vi.stubEnv("AUTH_SECRET", "test-auth-secret-at-least-32-chars-long");
vi.stubEnv("AUTH_GITHUB_ID", "test-github-id");
vi.stubEnv("AUTH_GITHUB_SECRET", "test-github-secret");
vi.stubEnv("AUTH_GOOGLE_ID", "test-google-id");
vi.stubEnv("AUTH_GOOGLE_SECRET", "test-google-secret");
vi.stubEnv("REDIS_URL", "redis://localhost:6379");
vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
