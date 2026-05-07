import Link from "next/link";
import { buildDocTree } from "@/lib/docs";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsSearch } from "@/components/docs/docs-search";

/**
 * Docs layout — three-pane: sidebar / content / right rail.
 *
 * The right rail is rendered per-page (not here) because it depends on
 * the parsed MDX headings of the current page.
 *
 * The sidebar is built from the filesystem tree at `content/docs/`.
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const tree = buildDocTree();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <DocsTopBar />
      <div
        style={{
          display: "flex",
          maxWidth: "1400px",
          margin: "0 auto",
          paddingTop: "24px",
        }}
      >
        <aside
          style={{
            width: "240px",
            flexShrink: 0,
            paddingLeft: "20px",
            paddingRight: "20px",
            borderRight: "1px solid var(--border)",
            position: "sticky",
            top: "60px",
            alignSelf: "flex-start",
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
          }}
        >
          <DocsSidebar tree={tree} />
        </aside>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            padding: "24px 40px 80px 40px",
            minWidth: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function DocsTopBar() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        height: "56px",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <Link
          href="/"
          className="font-sans"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--text)",
            textDecoration: "none",
          }}
        >
          <img src="/strawlonglogo.png" alt="Straw" style={{ height: "20px", width: "auto" }} />
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>/ docs</span>
        </Link>
        <DocsSearch />
        <nav
          className="font-sans"
          style={{ display: "flex", gap: "20px", fontSize: "13px" }}
        >
          <Link
            href="/docs"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Docs
          </Link>
          <Link
            href="/api/docs"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            API JSON
          </Link>
          <Link
            href="/dashboard"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Dashboard
          </Link>
          <a
            href="https://github.com/Jeremyliu-621/straw"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
