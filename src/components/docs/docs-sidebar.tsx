"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DocTreeNode } from "@/lib/docs";

/**
 * Recursive sidebar for the docs site. Top-level nodes render as section
 * headers; deeper nodes render as indented links. Highlights the current
 * route by matching against `usePathname`.
 */

interface DocsSidebarProps {
  tree: DocTreeNode;
}

export function DocsSidebar({ tree }: DocsSidebarProps) {
  return (
    <nav
      className="font-sans"
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {tree.children
        .filter((n) => !n.hidden)
        .map((section) => (
          <Section key={section.slug.join("/")} node={section} />
        ))}
    </nav>
  );
}

function Section({ node }: { node: DocTreeNode }) {
  return (
    <div>
      <SectionHeader node={node} />
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
        {node.children
          .filter((c) => !c.hidden)
          .map((child) => (
            <NavItem key={child.slug.join("/")} node={child} depth={1} />
          ))}
      </ul>
    </div>
  );
}

function SectionHeader({ node }: { node: DocTreeNode }) {
  const baseStyle = {
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    marginBottom: "8px",
    display: "block",
    textDecoration: "none",
  };

  if (node.hasPage) {
    return (
      <Link href={`/docs/${node.slug.join("/")}`} style={baseStyle}>
        {node.title}
      </Link>
    );
  }
  return <span style={baseStyle}>{node.title}</span>;
}

function NavItem({ node, depth }: { node: DocTreeNode; depth: number }) {
  const pathname = usePathname();
  const href = `/docs/${node.slug.join("/")}`;
  const active = pathname === href;

  return (
    <li>
      {node.hasPage ? (
        <Link
          href={href}
          style={{
            display: "block",
            padding: `4px ${8 + depth * 4}px`,
            paddingLeft: `${depth * 12}px`,
            fontSize: "13px",
            color: active ? "var(--text)" : "var(--text-muted)",
            background: active ? "var(--bg-subtle)" : "transparent",
            borderRadius: "4px",
            textDecoration: "none",
            fontWeight: active ? 500 : 400,
            transition: "background 0.15s ease, color 0.15s ease",
          }}
          onMouseOver={(e) => {
            if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)";
          }}
          onMouseOut={(e) => {
            if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {node.title}
        </Link>
      ) : (
        <span
          style={{
            display: "block",
            padding: `4px ${8 + depth * 4}px`,
            paddingLeft: `${depth * 12}px`,
            fontSize: "13px",
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          {node.title}
        </span>
      )}
      {node.children.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {node.children
            .filter((c) => !c.hidden)
            .map((child) => (
              <NavItem key={child.slug.join("/")} node={child} depth={depth + 1} />
            ))}
        </ul>
      )}
    </li>
  );
}
