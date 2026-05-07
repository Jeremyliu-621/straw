"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Database, FolderOpen, Code2 } from "lucide-react";
import { WorkspaceUsage } from "@/components/dashboard/workspace-usage";
import { Section } from "@/components/dashboard/section";

interface WorkspaceQuota {
  bytes_used: number;
  bytes_limit: number;
  keys_used?: number;
  keys_limit?: number;
  files_used?: number;
  files_limit?: number;
}

/**
 * Workspace landing page.
 *
 * Today this is a focused view of the per-agent KV + file-blob workspace
 * quotas. Browse / read / write UI is API-only for now (linked from this
 * page); a real file browser arrives later.
 */
export default function WorkspacePage() {
  const [kvQuota, setKvQuota] = useState<WorkspaceQuota | null>(null);
  const [filesQuota, setFilesQuota] = useState<WorkspaceQuota | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/workspace/quota").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/v1/workspace/files/quota").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([kv, files]) => {
        setKvQuota(kv as WorkspaceQuota | null);
        setFilesQuota(files as WorkspaceQuota | null);
      })
      .catch(() => {
        // empty state covers the failure path
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: "880px" }}>
      {/* Hero */}
      <div
        style={{
          paddingBottom: "24px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "24px",
        }}
      >
        <h1
          className="font-sans"
          style={{
            fontSize: "28px",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Workspace
        </h1>
        <p
          className="mt-2 font-sans"
          style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
        >
          Persistent per-agent storage. Survives across tasks.
        </p>
      </div>

      <Section label="Usage">
        {loading ? (
          <div
            className="animate-pulse"
            style={{
              height: "180px",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          />
        ) : (
          <WorkspaceUsage
            kv={{
              bytesUsed: kvQuota?.bytes_used ?? 0,
              bytesLimit: kvQuota?.bytes_limit ?? 10 * 1024 * 1024,
              keysUsed: kvQuota?.keys_used ?? 0,
              keysLimit: kvQuota?.keys_limit ?? 10000,
            }}
            files={{
              bytesUsed: filesQuota?.bytes_used ?? 0,
              bytesLimit: filesQuota?.bytes_limit ?? 100 * 1024 * 1024,
              filesUsed: filesQuota?.files_used ?? 0,
              filesLimit: filesQuota?.files_limit ?? 1000,
            }}
            manageHref="/api/docs"
          />
        )}
      </Section>

      <Section label="API surface" marginTop={32}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <ApiSurfaceCard
            icon={<Database size={16} strokeWidth={2} aria-hidden="true" />}
            title="KV"
            endpoints={[
              "GET /api/v1/workspace/kv",
              "GET /api/v1/workspace/kv/{key}",
              "PUT /api/v1/workspace/kv/{key}",
              "DELETE /api/v1/workspace/kv/{key}",
            ]}
            limits="1 MB per value · 10 MB total · 10K keys"
          />
          <ApiSurfaceCard
            icon={<FolderOpen size={16} strokeWidth={2} aria-hidden="true" />}
            title="Files"
            endpoints={[
              "GET /api/v1/workspace/files",
              "GET /api/v1/workspace/files/{path}",
              "POST /api/v1/workspace/files",
              "DELETE /api/v1/workspace/files/{path}",
            ]}
            limits="25 MB per file · 100 MB total · 1K files"
          />
        </div>
        <Link
          href="/api/docs"
          className="font-sans"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "16px",
            fontSize: "13px",
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
        >
          <Code2 size={14} strokeWidth={2} aria-hidden="true" />
          Full API contract →
        </Link>
      </Section>
    </div>
  );
}

function ApiSurfaceCard({
  icon,
  title,
  endpoints,
  limits,
}: {
  icon: React.ReactNode;
  title: string;
  endpoints: string[];
  limits: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg)",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>{icon}</span>
        <span
          className="font-sans"
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text)",
          }}
        >
          {title}
        </span>
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {endpoints.map((ep) => (
          <li
            key={ep}
            className="font-mono"
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ep}
          </li>
        ))}
      </ul>
      <p
        className="font-sans"
        style={{
          marginTop: "10px",
          fontSize: "11px",
          color: "var(--text-faint)",
        }}
      >
        {limits}
      </p>
    </div>
  );
}
