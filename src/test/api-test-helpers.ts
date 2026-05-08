import { vi } from "vitest";
import type { AuthenticatedUser } from "@/lib/auth-unified";
import { API_KEY_TIER } from "@/constants";

// ── Test UUIDs ─────────────────────────────────────────────────

// UUIDs must have valid v4 version/variant bits:
// - 3rd group starts with '4' (version)
// - 4th group starts with '8', '9', 'a', or 'b' (variant)
export const UUID = {
  user1: "11111111-1111-4111-a111-111111111111",
  user2: "22222222-2222-4222-a222-222222222222",
  task1: "aaaa1111-1111-4111-a111-aaaaaaaaaaaa",
  task2: "aaaa2222-2222-4222-a222-aaaaaaaaaaaa",
  submission1: "bbbb1111-1111-4111-a111-bbbbbbbbbbbb",
  submission2: "bbbb2222-2222-4222-a222-bbbbbbbbbbbb",
  agent1: "cccc1111-1111-4111-a111-cccccccccccc",
  deal1: "dddd1111-1111-4111-a111-dddddddddddd",
  criterion1: "eeee1111-1111-4111-a111-eeeeeeeeeeee",
} as const;

// ── Mock User Factories ────────────────────────────────────────

// Defaults assume tier='verified' (a human-attached key) and floor-qualified.
// Override `tier` and `isFloorQualified` per test for D37 tier-specific paths.
const DEFAULT_AUTH_FIELDS = {
  tier: API_KEY_TIER.VERIFIED,
  operatorTokenId: null,
  isFloorQualified: true,
} as const;

export function mockCompanyUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    supabaseId: UUID.user1,
    email: "company@example.com",
    name: "Test Company",
    role: "company",
    onboarded: true,
    authMethod: "api_key",
    ...DEFAULT_AUTH_FIELDS,
    ...overrides,
  };
}

export function mockAgentUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    supabaseId: UUID.agent1,
    email: "agent@example.com",
    name: "Test Agent",
    role: "agent_builder",
    onboarded: true,
    authMethod: "api_key",
    ...DEFAULT_AUTH_FIELDS,
    ...overrides,
  };
}

/**
 * Universal-role user: has a single role but should be able to do both
 * company actions (create tasks) and agent actions (submit to other tasks).
 */
export function mockUniversalUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    supabaseId: UUID.user2,
    email: "universal@example.com",
    name: "Universal User",
    role: "company",
    onboarded: true,
    authMethod: "api_key",
    ...DEFAULT_AUTH_FIELDS,
    ...overrides,
  };
}

// ── Request Factory ────────────────────────────────────────────

export function makeRequest(
  url: string,
  options: RequestInit = {}
): Request {
  return new Request(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer straw_sk_test123",
      ...Object.fromEntries(
        new Headers(options.headers as HeadersInit | undefined).entries()
      ),
    },
    ...options,
  });
}

export function makeJsonRequest(
  url: string,
  body: unknown,
  method = "POST"
): Request {
  return makeRequest(url, {
    method,
    body: JSON.stringify(body),
  });
}

export function makeGetRequest(url: string): Request {
  return makeRequest(url, { method: "GET" });
}

// ── Response Helpers ───────────────────────────────────────────

export async function parseJsonResponse(response: Response): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const body = await response.json();
  return { status: response.status, body };
}

// ── Supabase Mock Chain Builder ────────────────────────────────

/**
 * Creates a chainable mock Supabase client.
 *
 * Usage:
 *   const { db, mockTable } = createMockSupabase();
 *   mockTable("tasks").select().single({ data: myTask, error: null });
 */
export function createMockSupabase() {
  const tableConfigs = new Map<string, ChainConfig[]>();

  interface ChainConfig {
    operations: string[];
    terminalMethod: string;
    result: unknown;
  }

  function createChain(tableName: string): Record<string, unknown> {
    const ops: string[] = [];

    const chainProxy: Record<string, unknown> = {};

    const chainableMethods = [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "neq",
      "gt",
      "lt",
      "in",
      "or",
      "order",
      "limit",
      "is",
    ];

    const terminalMethods = ["single", "maybeSingle"];

    for (const method of chainableMethods) {
      chainProxy[method] = vi.fn((..._args: unknown[]) => {
        ops.push(method);
        return chainProxy;
      });
    }

    for (const method of terminalMethods) {
      chainProxy[method] = vi.fn(() => {
        ops.push(method);
        const configs = tableConfigs.get(tableName) ?? [];
        for (const config of configs) {
          if (config.terminalMethod === method) {
            return Promise.resolve(config.result);
          }
        }
        return Promise.resolve({ data: null, error: null });
      });
    }

    // For queries that resolve without terminal methods (e.g., delete().eq())
    // Return a thenable so `await` works
    chainProxy.then = (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown
    ) => {
      const configs = tableConfigs.get(tableName) ?? [];
      const defaultConfig = configs.find((c) => c.terminalMethod === "default");
      const result = defaultConfig?.result ?? { data: [], error: null, count: 0 };
      return Promise.resolve(result).then(resolve, reject);
    };

    return chainProxy;
  }

  const fromMock = vi.fn((tableName: string) => createChain(tableName));

  const storageMock = {
    from: vi.fn(() => ({
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.url/test" } }),
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://upload.url/test", token: "upload-token" },
      }),
    })),
  };

  const db = {
    from: fromMock,
    storage: storageMock,
  };

  function mockTable(tableName: string) {
    return {
      select: () => ({
        single: (result: { data: unknown; error: unknown }) => {
          const configs = tableConfigs.get(tableName) ?? [];
          configs.push({ operations: ["select"], terminalMethod: "single", result });
          tableConfigs.set(tableName, configs);
        },
        default: (result: { data: unknown; error: unknown; count?: number }) => {
          const configs = tableConfigs.get(tableName) ?? [];
          configs.push({ operations: ["select"], terminalMethod: "default", result });
          tableConfigs.set(tableName, configs);
        },
      }),
      insert: () => ({
        single: (result: { data: unknown; error: unknown }) => {
          const configs = tableConfigs.get(tableName) ?? [];
          configs.push({ operations: ["insert"], terminalMethod: "single", result });
          tableConfigs.set(tableName, configs);
        },
      }),
      update: () => ({
        single: (result: { data: unknown; error: unknown }) => {
          const configs = tableConfigs.get(tableName) ?? [];
          configs.push({ operations: ["update"], terminalMethod: "single", result });
          tableConfigs.set(tableName, configs);
        },
      }),
      delete: () => ({
        default: (result: { data: unknown; error: unknown }) => {
          const configs = tableConfigs.get(tableName) ?? [];
          configs.push({ operations: ["delete"], terminalMethod: "default", result });
          tableConfigs.set(tableName, configs);
        },
      }),
    };
  }

  function clearMocks() {
    tableConfigs.clear();
  }

  return { db, mockTable, clearMocks };
}

// ── Deadline Helpers ───────────────────────────────────────────

export function futureDeadline(hoursFromNow = 48): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

export function pastDeadline(hoursAgo = 48): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

// ── Valid Task Payload ─────────────────────────────────────────

export function validCreateTaskPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "Build a REST API parser",
    description: "Parse OpenAPI specs and generate TypeScript clients",
    category: "code-generation",
    input_spec: "An OpenAPI 3.0 JSON spec",
    output_spec: "TypeScript client code",
    test_weight: 60,
    llm_weight: 40,
    budget_cents: 50000,
    deadline: futureDeadline(72),
    criteria: [
      { name: "Correctness", description: "Output compiles and passes tests", weight: 60, position: 0 },
      { name: "Code Quality", description: "Clean, readable code", weight: 40, position: 1 },
    ],
    eval_mode: "llm",
    ...overrides,
  };
}

export function validCreateDealPayload(overrides: Record<string, unknown> = {}) {
  return {
    taskId: UUID.task1,
    agentId: UUID.agent1,
    dealType: "output_purchase",
    dealValueCents: 50000,
    ...overrides,
  };
}
