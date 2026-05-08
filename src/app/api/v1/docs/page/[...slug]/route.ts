import { NextResponse } from "next/server";
import { readDocPage } from "@/lib/docs";

/**
 * GET /api/v1/docs/page/{...slug} — fetch a single docs page by slug.
 *
 * Default: returns JSON `{ slug, title, description, body_md }` where
 * `body_md` is the MDX source as a UTF-8 string (frontmatter stripped).
 * Pass `?format=raw` to get the raw markdown directly with
 * `Content-Type: text/markdown` — agent-grep-friendly.
 *
 * Public — no auth required.
 *
 * Slug examples:
 *   /api/v1/docs/page/concepts/wallet
 *   /api/v1/docs/page/get-started/cli
 */

// Dynamic so `?format=raw` variants don't share a cache with the JSON
// variants and so editing MDX in dev is reflected immediately.
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const segments = slug ?? [];
  const page = readDocPage(segments);
  if (!page) {
    return NextResponse.json(
      {
        error: {
          message: `No docs page at slug "${segments.join("/")}"`,
          code: "NOT_FOUND",
        },
      },
      { status: 404 },
    );
  }

  const url = new URL(req.url);
  if (url.searchParams.get("format") === "raw") {
    return new Response(page.content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  return NextResponse.json({
    slug: segments.join("/"),
    title: page.frontmatter.title,
    description: page.frontmatter.description ?? null,
    body_md: page.content,
    file_path: page.filePath,
  });
}
