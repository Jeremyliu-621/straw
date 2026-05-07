"use client";

import Link from "next/link";
import { Database, FolderOpen } from "lucide-react";

/**
 * WorkspaceUsage — agent-only tile showing per-agent KV + file workspace
 * consumption against the platform caps (D24 + D26).
 *
 * Shape:
 *   ┌────────────────────────────────────────────────┐
 *   │ ⌗ WORKSPACE                                    │
 *   │                                                │
 *   │ KV   ▓▓▓░░░░░░░░░░  3.2 / 10 MB · 412 / 10K   │
 *   │ Files ▓░░░░░░░░░░░  2.1 / 100 MB · 18 / 1000  │
 *   │                                                │
 *   │ Manage workspace →                             │
 *   └────────────────────────────────────────────────┘
 *
 * Caps (from the API surface, see /api/docs):
 *   - KV: 1MB per value, 10MB total per agent, 10k keys per agent
 *   - Files: 25MB per file, 100MB total per agent, 1000 files per agent
 *
 * Empty state: collapsed tile with a single line "Workspace is empty."
 */
export interface WorkspaceUsageProps {
  kv: {
    bytesUsed: number;
    bytesLimit: number;
    keysUsed: number;
    keysLimit: number;
  };
  files: {
    bytesUsed: number;
    bytesLimit: number;
    filesUsed: number;
    filesLimit: number;
  };
  /** Where the "Manage" link goes. Defaults to /dashboard/agent#workspace; once a real workspace UI exists, pass it explicitly. */
  manageHref?: string;
}

export function WorkspaceUsage({
  kv,
  files,
  manageHref = "/dashboard/agent",
}: WorkspaceUsageProps) {
  const kvBytesPct = (kv.bytesUsed / kv.bytesLimit) * 100;
  const filesBytesPct = (files.bytesUsed / files.bytesLimit) * 100;
  const empty = kv.keysUsed === 0 && files.filesUsed === 0;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg)",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <Database size={14} strokeWidth={2} style={{ color: "var(--text-muted)" }} />
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
          Workspace
        </span>
      </div>

      {empty ? (
        <p
          className="font-sans"
          style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}
        >
          Empty. Use the workspace KV + files API to persist state across tasks.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <UsageRow
            icon={<Database size={11} strokeWidth={2} style={{ color: "var(--text-muted)" }} />}
            label="KV"
            barPct={kvBytesPct}
            primary={`${formatBytes(kv.bytesUsed)} / ${formatBytes(kv.bytesLimit)}`}
            secondary={`${kv.keysUsed.toLocaleString()} / ${kv.keysLimit.toLocaleString()} keys`}
          />
          <UsageRow
            icon={<FolderOpen size={11} strokeWidth={2} style={{ color: "var(--text-muted)" }} />}
            label="Files"
            barPct={filesBytesPct}
            primary={`${formatBytes(files.bytesUsed)} / ${formatBytes(files.bytesLimit)}`}
            secondary={`${files.filesUsed.toLocaleString()} / ${files.filesLimit.toLocaleString()} files`}
          />
        </div>
      )}

      <Link
        href={manageHref}
        className="font-sans"
        style={{
          display: "inline-block",
          marginTop: "12px",
          fontSize: "12px",
          color: "var(--text-muted)",
          textDecoration: "none",
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
        onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        Manage workspace →
      </Link>
    </div>
  );
}

function UsageRow({
  icon,
  label,
  barPct,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  label: string;
  barPct: number;
  primary: string;
  secondary: string;
}) {
  const fill = Math.min(100, Math.max(0, barPct));
  const barColor = fill >= 90 ? "var(--warning)" : fill >= 60 ? "var(--text-muted)" : "var(--text-faint)";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {icon}
          <span
            className="font-sans"
            style={{ fontSize: "12px", color: "var(--text)" }}
          >
            {label}
          </span>
        </div>
        <span
          className="font-mono"
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {primary}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: "3px",
          background: "var(--bg-subtle)",
          borderRadius: "2px",
          overflow: "hidden",
          marginBottom: "4px",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            width: `${fill}%`,
            height: "100%",
            background: barColor,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <p
        className="font-sans"
        style={{
          fontSize: "11px",
          color: "var(--text-faint)",
          margin: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {secondary}
      </p>
    </div>
  );
}

/**
 * Format a byte count as a compact human-readable string (e.g. "3.2 MB",
 * "412 KB", "18 B"). Pure — exposed for unit testing.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${bytes} B`;
}
