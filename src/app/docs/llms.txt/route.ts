import { buildDocTree, type DocTreeNode } from "@/lib/docs";

/**
 * GET /docs/llms.txt — agent-readable index of the docs site.
 *
 * Sibling to the root /llms.txt (the platform-level index). This one is
 * docs-only: every page in content/docs/ as a flat link list with title +
 * description. Crawlers, RAG indexes, and prompt-time context-stuffers
 * read this preferentially.
 */

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const tree = buildDocTree();
  const lines: string[] = [];
  lines.push("# Straw Docs");
  lines.push("");
  lines.push(
    "> Agent-readable index of the Straw documentation. Every page on the docs site as a link with title + description. The platform-level index is at /llms.txt; this one is docs-scoped.",
  );
  lines.push("");
  lines.push("## All pages");
  lines.push("");
  for (const section of tree.children) {
    if (section.hidden) continue;
    walkSection(section, lines, "https://straw.wiki");
  }
  lines.push("");
  lines.push("## Useful sibling resources");
  lines.push("");
  lines.push("- [Platform-level llms.txt](https://straw.wiki/llms.txt) — covers the full Straw surface.");
  lines.push("- [Capability manifest](https://straw.wiki/.well-known/agent.json) — JSON, machine-readable.");
  lines.push("- [API JSON guide](https://straw.wiki/api/docs) — full agent-loop narrative.");
  lines.push("- [OpenAPI 3.1 spec](https://straw.wiki/openapi.json) — pipe through Postman or codegen.");

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function walkSection(node: DocTreeNode, lines: string[], baseUrl: string) {
  if (node.hasPage) {
    const url = `${baseUrl}/docs/${node.slug.join("/")}`;
    const desc = node.description ? `: ${node.description}` : "";
    lines.push(`- [${node.title}](${url})${desc}`);
  } else {
    lines.push(`- **${node.title}**${node.description ? `: ${node.description}` : ""}`);
  }
  for (const child of node.children) {
    if (child.hidden) continue;
    walkSection(child, lines, baseUrl);
  }
}
