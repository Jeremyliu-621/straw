"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Code block with a copy button. Used by the MDX renderer's `pre`
 * component. Children is the highlighted HTML emitted by shiki at build /
 * render time.
 */
export function CodeBlock({ children, raw }: { children: React.ReactNode; raw: string }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  function handleCopy() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(raw).then(() => setCopied(true)).catch(() => {});
  }

  return (
    <div style={{ position: "relative", margin: "20px 0" }}>
      <pre
        ref={ref}
        style={{
          background: "var(--bg-subtle)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "16px 16px 16px 20px",
          overflowX: "auto",
          fontSize: "13px",
          lineHeight: 1.5,
          fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
        }}
      >
        {children}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="font-sans"
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          padding: "4px 8px",
          fontSize: "11px",
          fontWeight: 500,
          color: "var(--text-muted)",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          cursor: "pointer",
          opacity: 0.6,
          transition: "opacity 0.15s ease",
        }}
        onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.6")}
        aria-label="Copy code"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
