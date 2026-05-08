"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { DocTreeNode } from "@/lib/docs";
import { DocsSidebar } from "./docs-sidebar";
import { DocsSearch } from "./docs-search";

/**
 * Docs shell — client component holding the mobile drawer state. Wraps
 * the server-rendered children with sidebar / topbar / drawer toggle.
 *
 * Three breakpoints in CSS:
 * - >1024px: three-pane (sidebar / content / right-rail TOC)
 * - 768-1024px: hide right-rail TOC
 * - <768px: sidebar collapses to a slide-in drawer behind the hamburger
 */
export function DocsShell({
  tree,
  children,
}: {
  tree: DocTreeNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div
      data-docs-layout
      className="docs-root"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <DocsTopBar onMenuClick={() => setDrawerOpen((v) => !v)} />
      <div
        style={{
          display: "flex",
          maxWidth: "1400px",
          margin: "0 auto",
          paddingTop: "24px",
        }}
      >
        <aside
          className="docs-sidebar"
          data-open={drawerOpen ? "true" : "false"}
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
        {drawerOpen && (
          <div
            className="docs-sidebar-backdrop"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        )}
        <div
          className="docs-content-wrapper"
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            padding: "24px 40px 80px 40px",
            minWidth: 0,
          }}
        >
          <div className="docs-content" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocsTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Toggle docs sidebar"
            className="docs-mobile-menu-button"
            style={{
              width: "32px",
              height: "32px",
              padding: 0,
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
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
        </div>
        <DocsSearch />
        <nav
          className="font-sans"
          style={{ display: "flex", gap: "20px", fontSize: "13px" }}
        >
          <Link href="/docs" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            Docs
          </Link>
          <Link href="/api/docs" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            API JSON
          </Link>
          <Link href="/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
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
