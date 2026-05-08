/**
 * OpenAPI spec loader for the docs site.
 *
 * Reads `public/openapi.json` once at module init. Indexes the spec by tag
 * for fast lookups in the docs renderer. Re-runs on each cold start (which
 * for Vercel functions is per-request-ish, but the file is small).
 */

import fs from "node:fs";
import path from "node:path";

const SPEC_PATH = path.join(process.cwd(), "public", "openapi.json");

export interface OpenApiInfo {
  title: string;
  version: string;
  description?: string;
}

export interface OpenApiTag {
  name: string;
  description?: string;
}

export interface OpenApiOperation {
  /** HTTP method, lowercase. */
  method: "get" | "post" | "put" | "delete" | "patch";
  /** Full path with parameter brackets, e.g. /api/v1/tasks/{id}. */
  pathPattern: string;
  /** First (or only) tag — used for grouping. */
  tag: string | null;
  summary?: string;
  description?: string;
  security?: Array<Record<string, string[]>>;
  parameters?: Array<{
    name: string;
    in: "query" | "path" | "header";
    required?: boolean;
    schema?: unknown;
    description?: string;
  }>;
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: unknown }>;
  };
  responses: Record<string, {
    description?: string;
    content?: Record<string, { schema?: unknown }>;
  }>;
}

export interface OpenApiSpec {
  info: OpenApiInfo;
  servers: Array<{ url: string; description?: string }>;
  tags: OpenApiTag[];
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
  /** Indexed by tag name → ordered list of operations under that tag. */
  operationsByTag: Record<string, OpenApiOperation[]>;
}

let cached: OpenApiSpec | null = null;

export function loadOpenApiSpec(): OpenApiSpec {
  if (cached) return cached;
  const raw = fs.readFileSync(SPEC_PATH, "utf8");
  const json = JSON.parse(raw) as Record<string, unknown>;

  const info = json.info as OpenApiInfo;
  const servers = (json.servers as { url: string; description?: string }[]) ?? [];
  const tags = (json.tags as OpenApiTag[]) ?? [];
  const components = json.components as OpenApiSpec["components"];

  const operationsByTag: Record<string, OpenApiOperation[]> = {};
  const paths = (json.paths as Record<string, Record<string, unknown>>) ?? {};

  for (const [pathPattern, pathItem] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(pathItem)) {
      if (!isHttpMethod(method)) continue;
      const operation = op as Record<string, unknown>;
      const tagList = (operation.tags as string[] | undefined) ?? [];
      const primaryTag = tagList[0] ?? null;
      const enriched: OpenApiOperation = {
        method: method as OpenApiOperation["method"],
        pathPattern,
        tag: primaryTag,
        summary: operation.summary as string | undefined,
        description: operation.description as string | undefined,
        security: operation.security as OpenApiOperation["security"],
        parameters: operation.parameters as OpenApiOperation["parameters"],
        requestBody: operation.requestBody as OpenApiOperation["requestBody"],
        responses: (operation.responses as OpenApiOperation["responses"]) ?? {},
      };
      const key = primaryTag ?? "Other";
      if (!operationsByTag[key]) operationsByTag[key] = [];
      operationsByTag[key].push(enriched);
    }
  }

  cached = { info, servers, tags, components, operationsByTag };
  return cached;
}

function isHttpMethod(s: string): boolean {
  return ["get", "post", "put", "delete", "patch"].includes(s);
}

/**
 * Resolve a `$ref` string against the components map. Cheap shallow
 * resolver — handles `#/components/schemas/X`. Returns the raw schema
 * object or null if it can't resolve.
 */
export function resolveRef(spec: OpenApiSpec, ref: string): unknown {
  if (!ref.startsWith("#/components/schemas/")) return null;
  const name = ref.slice("#/components/schemas/".length);
  return spec.components?.schemas?.[name] ?? null;
}

/**
 * URL-friendly tag slug. "Operator Tokens" → "operator-tokens".
 */
export function tagSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, "-");
}

export function tagFromSlug(spec: OpenApiSpec, slug: string): string | null {
  return spec.tags.find((t) => tagSlug(t.name) === slug)?.name ?? null;
}
