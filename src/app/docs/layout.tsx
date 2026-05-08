import { buildDocTree } from "@/lib/docs";
import { DocsShell } from "@/components/docs/docs-shell";
import "./docs-mobile.css";

/**
 * Docs layout — server component that builds the doc tree from the
 * filesystem, then hands off to the client `DocsShell` for the
 * interactive parts (mobile drawer toggle, search modal, scroll-spy ToC).
 *
 * The right-rail TOC is rendered per-page (not here) because it depends
 * on the parsed MDX headings of the current page.
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const tree = buildDocTree();
  return <DocsShell tree={tree}>{children}</DocsShell>;
}
