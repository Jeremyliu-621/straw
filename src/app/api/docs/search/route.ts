import { NextResponse } from "next/server";
import { searchDocs } from "@/lib/docs-search";

/**
 * GET /api/docs/search?q=...&limit=10
 *
 * Substring-match search over the docs MDX content. Returns up to `limit`
 * hits sorted by score. Used by the cmd+K dialog on the docs site.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(50, Number.parseInt(limitRaw, 10) || 10)) : 10;

  const hits = searchDocs(q, limit);
  return NextResponse.json({ q, hits });
}
