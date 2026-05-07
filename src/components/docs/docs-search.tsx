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
 * Cmd+K search dialog. Top-of-docs button + global keyboard listener.
 * Fetches /api/docs/search?q=... on each keystroke (debounced).
 */
export function DocsSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-sans"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          fontSize: "13px",
          color: "var(--text-muted)",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          cursor: "pointer",
          minWidth: "200px",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span style={{ flex: 1, textAlign: "left" }}>Search docs…</span>
        <span
          style={{
            fontSize: "11px",
            padding: "1px 6px",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          ⌘K
        </span>
      </button>

      {open && (
        <SearchDialog
          query={query}
          setQuery={setQuery}
          hits={hits}
          loading={loading}
          activeIdx={activeIdx}
          setActiveIdx={setActiveIdx}
          onClose={() => setOpen(false)}
          inputRef={inputRef}
        />
      )}
    </>
  );
}

function SearchDialog({
  query,
  setQuery,
  hits,
  loading,
  activeIdx,
  setActiveIdx,
  onClose,
  inputRef,
}: {
  query: string;
  setQuery: (q: string) => void;
  hits: SearchHit[];
  loading: boolean;
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 90vw)",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)", marginRight: "8px" }}>
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
                window.location.href = `/docs/${hits[activeIdx].slug}`;
              }
            }}
            placeholder="Search docs…"
            className="font-sans"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "16px",
              color: "var(--text)",
            }}
          />
          {loading && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>…</span>}
        </div>
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {hits.length === 0 && query.trim() && !loading && (
            <p
              className="font-sans"
              style={{ padding: "20px 16px", fontSize: "13px", color: "var(--text-muted)" }}
            >
              No matches.
            </p>
          )}
          {hits.length === 0 && !query.trim() && (
            <p
              className="font-sans"
              style={{ padding: "20px 16px", fontSize: "13px", color: "var(--text-muted)" }}
            >
              Type to search across all docs pages.
            </p>
          )}
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {hits.map((h, i) => (
              <li key={h.slug}>
                <Link
                  href={`/docs/${h.slug}`}
                  onClick={onClose}
                  className="font-sans"
                  style={{
                    display: "block",
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    textDecoration: "none",
                    color: "var(--text)",
                    background: i === activeIdx ? "var(--bg-subtle)" : "transparent",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "2px" }}>
                    {h.title}
                  </div>
                  {h.description && (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      {h.description}
                    </div>
                  )}
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {h.snippet}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
