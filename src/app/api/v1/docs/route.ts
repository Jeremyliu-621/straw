import { NextResponse } from "next/server";
import { buildDocTree, type DocTreeNode } from "@/lib/docs";

/**
 * GET /api/v1/docs — flat list of every published docs page.
 *
 * Returns every page in the docs tree as `{ slug, title, description }`.
 * Agents use this to enumerate the surface; pair it with
 * GET /api/v1/docs/page/{slug} to fetch the markdown body of any page.
 *
 * Public — no auth required.
 */

// Dynamic so query-param variants (none today; future-friendly) and
// filesystem updates land immediately. The work is cheap.
export const dynamic = "force-dynamic";

interface FlatPage {
  slug: string;
  title: string;
  description?: string;
}

export async function GET() {
  const tree = buildDocTree();
  const pages: FlatPage[] = [];
  walk(tree, pages);
  return NextResponse.json({ pages });
}

function walk(node: DocTreeNode, out: FlatPage[]) {
  if (node.hasPage && node.slug.length > 0) {
    out.push({
      slug: node.slug.join("/"),
      title: node.title,
      description: node.description,
    });
  } else if (node.slug.length === 0 && node.hasPage) {
    out.push({ slug: "", title: node.title, description: node.description });
  }
  for (const child of node.children) {
    if (child.hidden) continue;
    walk(child, out);
  }
}
