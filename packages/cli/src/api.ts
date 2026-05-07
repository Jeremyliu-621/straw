/**
 * Thin fetch wrapper for the Straw API.
 *
 * Mirrors the SDK's surface but lives inside the CLI to avoid an extra
 * bundling step. If the SDK ever stabilizes a thin "client.ts" that's safe
 * to import here, we'll switch.
 */

import { loadConfig } from "./config";

export interface ApiOptions {
  /** Override the configured base URL. */
  baseUrl?: string;
  /** Override the configured api_key. Pass null to send no Authorization
   *  header (e.g., the register-anonymous endpoint). */
  apiKey?: string | null;
}

export interface ApiError {
  ok: false;
  status: number;
  body: unknown;
}

export interface ApiSuccess<T> {
  ok: true;
  status: number;
  body: T;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  opts: ApiOptions = {},
): Promise<ApiResult<T>> {
  const cfg = loadConfig();
  const baseUrl = opts.baseUrl ?? cfg.base_url;
  const apiKey = opts.apiKey === undefined ? cfg.api_key : opts.apiKey;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": `straw-cli/0.1.0`,
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: { error: { message: `Network error: ${(err as Error).message}` } },
    };
  }

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }
  return { ok: true, status: res.status, body: body as T };
}
