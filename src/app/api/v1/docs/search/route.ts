import { NextResponse } from "next/server";
import { searchDocs } from "@/lib/docs-search";

/**
 * GET /api/v1/docs/search?q=...&limit=10
 *
 * v1-stable docs search. Matches the older `/api/docs/search` shape but
 * lives under the versioned namespace so it's part of the published
 * OpenAPI surface. Public — no auth required.
 *
 * Returns up to `limit` matches sorted by score, with title +
 * description + a snippet around the highest-scoring body hit.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw
    ? Math.max(1, Math.min(50, Number.parseInt(limitRaw, 10) || 10))
    : 10;

  const hits = searchDocs(q, limit);
  return NextResponse.json({ q, hits });
}
