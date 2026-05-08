"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface SearchHit {
  slug: string;
  title: string;
  description?: string;
  snippet: string;
  score: number;
}

/**
 * Docs search — a wide dropdown anchored under the trigger button.
 * Cmd/Ctrl+K opens it, Escape closes it. Click outside closes it.
 *
 * `openInNewTab` controls how a result click navigates. From the
 * dashboard, true → a new tab so the user keeps their dashboard state.
 * From the docs site itself, false (default) → same-tab navigation.
 */
export function DocsSearch({ openInNewTab = false }: { openInNewTab?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Open on cmd/ctrl+K, close on escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Click-outside closes the dropdown.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    if (!open) {
      setQuery("");
      setHits([]);
      setActiveIdx(0);
    }
  }, [open]);

  // Debounce query.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/docs/search?q=${encodeURIComponent(trimmed)}&limit=10`)
        .then((res) => res.json())
        .then((data: { hits?: SearchHit[] }) => {
          setHits(Array.isArray(data.hits) ? data.hits : []);
          setActiveIdx(0);
        })
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 120);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="font-sans"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          height: "30px",
          padding: "0 10px",
          fontSize: "12px",
          fontWeight: 500,
          color: open ? "var(--text)" : "var(--text-muted)",
          background: open ? "var(--bg-subtle)" : "var(--bg-card)",
          border: "1px solid var(--border)",
          borderColor: open ? "var(--text-faint)" : "var(--border)",
          borderRadius: "var(--radius)",
          cursor: "pointer",
          minWidth: "180px",
          transition:
            "background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease",
        }}
        onMouseOver={(e) => {
          if (open) return;
          e.currentTarget.style.background = "var(--bg-subtle)";
          e.currentTarget.style.color = "var(--text)";
          e.currentTarget.style.borderColor = "var(--text-faint)";
        }}
        onMouseOut={(e) => {
          if (open) return;
          e.currentTarget.style.background = "var(--bg-card)";
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span style={{ flex: 1, textAlign: "left" }}>Search docs…</span>
        <span
          style={{
            fontSize: "10px",
            lineHeight: 1,
            padding: "2px 5px",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            fontFamily: "var(--font-mono, monospace)",
            color: "var(--text-faint)",
            flexShrink: 0,
          }}
        >
          ⌘K
        </span>
      </button>

      {open && (
        <SearchDropdown
          query={query}
          setQuery={setQuery}
          hits={hits}
          loading={loading}
          activeIdx={activeIdx}
          setActiveIdx={setActiveIdx}
          onClose={() => setOpen(false)}
          inputRef={inputRef}
          openInNewTab={openInNewTab}
        />
      )}
    </div>
  );
}

function SearchDropdown({
  query,
  setQuery,
  hits,
  loading,
  activeIdx,
  setActiveIdx,
  onClose,
  inputRef,
  openInNewTab,
}: {
  query: string;
  setQuery: (q: string) => void;
  hits: SearchHit[];
  loading: boolean;
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  openInNewTab: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-label="Docs search"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        width: "min(560px, calc(100vw - 32px))",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "var(--text-muted)", marginRight: "8px", flexShrink: 0 }}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx(Math.min(hits.length - 1, activeIdx + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx(Math.max(0, activeIdx - 1));
            }
            if (e.key === "Enter" && hits[activeIdx]) {
              const target = `/docs/${hits[activeIdx].slug}`;
              if (openInNewTab) {
                window.open(target, "_blank", "noopener,noreferrer");
                onClose();
              } else {
                window.location.href = target;
              }
            }
          }}
          placeholder="Search docs…"
          className="font-sans"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "14px",
            color: "var(--text)",
          }}
        />
        {loading && (
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>…</span>
        )}
      </div>
      <div style={{ maxHeight: "420px", overflowY: "auto" }}>
        {hits.length === 0 && query.trim() && !loading && (
          <p
            className="font-sans"
            style={{
              padding: "16px 14px",
              fontSize: "13px",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            No matches.
          </p>
        )}
        {hits.length === 0 && !query.trim() && (
          <p
            className="font-sans"
            style={{
              padding: "16px 14px",
              fontSize: "13px",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            Type to search across all docs pages.
          </p>
        )}
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {hits.map((h, i) => {
            const sharedItemStyle = {
              display: "block" as const,
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
              textDecoration: "none" as const,
              color: "var(--text)",
              background: i === activeIdx ? "var(--bg-subtle)" : "transparent",
            };
            const inner = (
              <>
                <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "2px" }}>
                  {h.title}
                </div>
                {h.description && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginBottom: "3px",
                    }}
                  >
                    {h.description}
                  </div>
                )}
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {h.snippet}
                </div>
              </>
            );
            if (openInNewTab) {
              return (
                <li key={h.slug}>
                  <a
                    href={`/docs/${h.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className="font-sans"
                    style={sharedItemStyle}
                  >
                    {inner}
                  </a>
                </li>
              );
            }
            return (
              <li key={h.slug}>
                <Link
                  href={`/docs/${h.slug}`}
                  onClick={onClose}
                  className="font-sans"
                  style={sharedItemStyle}
                >
                  {inner}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
