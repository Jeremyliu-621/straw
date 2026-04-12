"use client";

import { useState } from "react";
import { Terminal, Copy, Check, Key, ChevronRight } from "lucide-react";
import { BackLink, LABEL_STYLE } from "../shared";
import { useArena } from "../ArenaProvider";
import { MOCK_API_KEY, CODE_EXAMPLES } from "../data";

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 12 }}>
      <div
        className="flex items-center justify-between font-sans"
        style={{
          padding: "8px 12px",
          background: "var(--bg-subtle)",
          borderBottom: "1px solid var(--border)",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-muted)",
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal size={12} strokeWidth={1.5} />
          {label}
        </div>
        <button
          className="flex items-center gap-1"
          style={{
            background: "none",
            border: "none",
            fontSize: 11,
            color: "var(--text-faint)",
            cursor: "pointer",
            padding: "2px 6px",
          }}
          onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        >
          {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="font-mono"
        style={{
          padding: "12px 16px",
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--text)",
          background: "var(--bg)",
          margin: 0,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {code}
      </pre>
    </div>
  );
}

export default function ApiPage() {
  const { goBack } = useArena();

  return (
    <div>
      <BackLink onClick={goBack}>Back to Dashboard</BackLink>

      <h2 className="font-sans" style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)", margin: 0 }}>
        API Access
      </h2>
      <p className="font-sans" style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.6 }}>
        Manage your API keys and integrate with the Straw platform programmatically.
      </p>

      {/* Docs banner */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px 8px 8px",
          marginTop: 24,
          background: "var(--bg)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: "999px",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "999px",
            background: "var(--text)",
            color: "var(--bg)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          New
        </span>
        Full API documentation
        <ChevronRight size={14} strokeWidth={2} style={{ opacity: 0.6 }} />
      </div>

      {/* Secret Keys */}
      <div style={{ marginTop: 32 }}>
        <p className="font-sans" style={{ ...LABEL_STYLE, marginBottom: 12 }}>SECRET KEYS</p>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          {/* Header */}
          <div
            className="grid font-sans"
            style={{
              gridTemplateColumns: "1fr 120px 120px 80px",
              ...LABEL_STYLE,
              padding: "10px 16px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg-subtle)",
            }}
          >
            <span>Key</span>
            <span>Name</span>
            <span>Last Used</span>
            <span />
          </div>
          {/* Row */}
          <div
            className="grid font-sans"
            style={{
              gridTemplateColumns: "1fr 120px 120px 80px",
              padding: "12px 16px",
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <span className="font-mono flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Key size={14} strokeWidth={1.5} style={{ color: "var(--text-faint)" }} />
              {MOCK_API_KEY.prefix}
            </span>
            <span style={{ color: "var(--text-muted)" }}>{MOCK_API_KEY.name}</span>
            <span style={{ color: "var(--text-muted)" }}>{MOCK_API_KEY.lastUsed}</span>
            <span style={{ color: "var(--error, #dc2626)", fontSize: 12, cursor: "pointer" }}>Revoke</span>
          </div>
        </div>
      </div>

      {/* Quick Reference */}
      <div style={{ marginTop: 40 }}>
        <p className="font-sans" style={{ ...LABEL_STYLE, marginBottom: 12 }}>QUICK REFERENCE</p>
        {CODE_EXAMPLES.map((ex) => (
          <CodeBlock key={ex.label} label={ex.label} code={ex.code} />
        ))}
      </div>

      <p className="font-sans" style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 16 }}>
        Full documentation available at{" "}
        <span style={{ color: "var(--text)", fontWeight: 500 }}>docs.straw.dev</span>
      </p>
    </div>
  );
}
