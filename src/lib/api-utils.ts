import { NextResponse } from "next/server";

/** UUID v4 format regex for validating route params. */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate that a string is a valid UUID. Returns an error response if not.
 */
export function validateUuid(id: string, label = "ID") {
  if (!UUID_REGEX.test(id)) {
    return apiError(`Invalid ${label}`, 400, "INVALID_UUID");
  }
  return null;
}

/**
 * Safely parse JSON from a request body. Returns the parsed body or an error response.
 */
export async function parseBody(req: Request): Promise<{ data: unknown } | { error: NextResponse }> {
  try {
    const data = await req.json();
    return { data };
  } catch {
    return { error: apiError("Invalid JSON in request body", 400) };
  }
}

/**
 * Standardized API error response.
 *
 * All API routes should use this for error responses to ensure consistency.
 */
export function apiError(
  message: string,
  status: number,
  code?: string,
  details?: unknown
) {
  return NextResponse.json(
    {
      error: {
        message,
        code: code ?? httpStatusToCode(status),
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status }
  );
}

function httpStatusToCode(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "RATE_LIMITED";
    case 500:
      return "INTERNAL_ERROR";
    default:
      return "ERROR";
  }
}

/**
 * Parse pagination params from a request URL.
 *
 * Supports cursor-based pagination:
 * - `limit` — max items per page (default 20, max 100)
 * - `cursor` — opaque cursor (created_at timestamp) for next page
 *
 * Returns parsed params and a helper to build the `next_cursor` response field.
 */
export function parsePagination(url: URL): {
  limit: number;
  cursor: string | null;
} {
  const limitParam = url.searchParams.get("limit");
  const rawLimit = limitParam ? parseInt(limitParam, 10) : 20;
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 100);
  const cursor = url.searchParams.get("cursor");
  return { limit, cursor };
}

/**
 * Build a paginated response envelope.
 */
export function paginatedResponse<T extends { created_at: string }>(
  data: T[],
  limit: number
) {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore ? items[items.length - 1]?.created_at ?? null : null;

  return NextResponse.json({
    data: items,
    pagination: {
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  });
}
