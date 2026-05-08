"use client";

import type { ReactNode } from "react";

/**
 * Shared dashboard layout primitives.
 *
 * Section + RowGroup + RowSkeleton + EmptyState — extracted out of the
 * agent dashboard's inline JSX so the company dashboard (and any future
 * dashboard surface) can share the same visual rhythm without
 * copy-pasting fifty lines of style props per page.
 *
 * The agent dashboard currently keeps its own inline copies; once that
 * file's WIP settles, swap those for these imports for full parity.
 */

export function Section({
  label,
  count,
  marginTop = 0,
  trailing,
  children,
}: {
  /** Uppercase tracked header label, e.g. "Your Submissions". */
  label: string;
  /** Optional count rendered next to the label as a muted "(N)" chip. */
  count?: number;
  /** Top margin in px (default 0). Use 32 for sections that follow another section. */
  marginTop?: number;
  /** Optional right-aligned content next to the header — e.g. a callout banner or filter. */
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ marginTop: marginTop ? `${marginTop}px` : undefined }}>
      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <span
          className="font-sans"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-muted)",
          }}
        >
          {label}
          {typeof count === "number" && (
            <span style={{ marginLeft: "8px", color: "var(--text-faint)" }}>({count})</span>
          )}
        </span>
        {trailing}
      </div>
      {children}
    </div>
  );
}

/**
 * Bordered list container — wraps the rows of a section's table. The
 * border lives on the parent, individual rows paint their own bottom
 * borders, the last row's `:last-child` wins (no double-border).
 */
export function RowGroup({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Loading-state pulse rows. Use while a section's data is fetching.
 */
export function RowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            height: "56px",
            background: "var(--bg-subtle)",
            borderRadius: "var(--radius)",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Empty-state inside a section's body. Centered icon + title + body
 * paragraph. Optional `action` slot for a CTA (e.g. "Post a Task").
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        padding: "40px 20px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      {icon}
      <p
        className="mt-3 font-sans"
        style={{ fontSize: "16px", fontWeight: 500, color: "var(--text)" }}
      >
        {title}
      </p>
      <p
        className="mt-1 font-sans text-center"
        style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "320px" }}
      >
        {body}
      </p>
      {action && <div style={{ marginTop: "16px" }}>{action}</div>}
    </div>
  );
}
