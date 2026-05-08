"use client";

import { useEffect, useState } from "react";
import type { DocHeading } from "@/lib/docs";

/**
 * Right-rail "On this page" component. Highlights the heading currently
 * scrolled into view. Falls back gracefully if there's only one heading.
 */
export function DocsToc({ headings }: { headings: DocHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost heading currently in view.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length <= 1) return null;

  return (
    <aside
      className="font-sans docs-toc-rail"
      style={{
        position: "sticky",
        top: "80px",
        alignSelf: "flex-start",
        width: "200px",
        flexShrink: 0,
        maxHeight: "calc(100vh - 100px)",
        overflowY: "auto",
        paddingLeft: "12px",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "10px",
        }}
      >
        On this page
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {headings.map((h) => (
          <li
            key={h.id}
            style={{
              paddingLeft: h.depth === 3 ? "12px" : "0",
              marginBottom: "6px",
            }}
          >
            <a
              href={`#${h.id}`}
              style={{
                fontSize: "13px",
                color: activeId === h.id ? "var(--text)" : "var(--text-muted)",
                textDecoration: "none",
                fontWeight: activeId === h.id ? 500 : 400,
                lineHeight: 1.4,
                display: "block",
                transition: "color 0.15s ease",
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
