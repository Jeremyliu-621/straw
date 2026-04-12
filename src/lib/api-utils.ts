import { NextResponse } from "next/server";

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
