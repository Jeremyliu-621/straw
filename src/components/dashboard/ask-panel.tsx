"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowUp, AlertCircle } from "lucide-react";

/**
 * AskPanel — small chat surface that hangs off the TopBar "Ask" pill.
 *
 * Single-purpose: ask Gemini a question about Straw, get a reply.
 * Multi-turn conversation (up to ~20 messages) is preserved within a
 * single panel session; closing the panel resets the transcript.
 *
 * Wires to POST /api/dashboard/ask. No streaming today — the response
 * shows up after a short loading state. Streaming is a follow-up.
 */

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "How do I submit my first agent?",
  "What's the difference between deterministic tests and the LLM judge?",
  "Where do I get an API key?",
];

export function AskPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Autofocus when the panel opens; scroll the transcript on each
  // new message so the latest reply is visible.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const j: { reply: string } = await res.json();
      setMessages((cur) => [...cur, { role: "assistant", content: j.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
      // Re-focus so the user can immediately type a follow-up.
      inputRef.current?.focus();
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Ask Straw"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        width: "440px",
        height: "520px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={13} strokeWidth={2} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
          <p
            className="font-sans"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            Ask Straw
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-sans"
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          Close
        </button>
      </header>

      {/* Transcript */}
      <div
        ref={transcriptRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.length === 0 && (
          <div>
            <p
              className="font-sans"
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                margin: "0 0 12px 0",
                lineHeight: 1.5,
              }}
            >
              Ask anything about the dashboard, the API, or how to submit an agent.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="font-sans"
                  style={{
                    textAlign: "left",
                    fontSize: "12px",
                    color: "var(--text)",
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "8px 12px",
                    cursor: "pointer",
                    transition: "background-color 0.12s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "var(--bg-strong)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "var(--bg-subtle)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
        {loading && <TypingDots />}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "var(--radius)",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border)",
            }}
          >
            <AlertCircle size={13} strokeWidth={2} style={{ color: "var(--cta)" }} aria-hidden="true" />
            <p
              className="font-sans"
              style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}
            >
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{
          padding: "12px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "flex-end",
          gap: "8px",
          flexShrink: 0,
          background: "var(--bg-subtle)",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter inserts a newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask anything…"
          className="font-sans outline-none"
          style={{
            flex: 1,
            resize: "none",
            fontSize: "13px",
            lineHeight: 1.5,
            color: "var(--text)",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "8px 12px",
            maxHeight: "120px",
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          aria-label="Send"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "var(--radius)",
            background: input.trim() && !loading ? "var(--cta)" : "var(--bg-strong)",
            color: input.trim() && !loading ? "#fff" : "var(--text-faint)",
            border: "none",
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            transition: "background-color 0.12s ease",
            flexShrink: 0,
          }}
        >
          <ArrowUp size={14} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        padding: "8px 12px",
        borderRadius: "var(--radius)",
        background: isUser ? "var(--bg-strong)" : "transparent",
        border: isUser ? "none" : "1px solid var(--border)",
      }}
    >
      <p
        className="font-sans"
        style={{
          margin: 0,
          fontSize: "13px",
          lineHeight: 1.55,
          color: "var(--text)",
          whiteSpace: "pre-wrap",
        }}
      >
        {msg.content}
      </p>
    </div>
  );
}

function TypingDots() {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        padding: "10px 14px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        display: "flex",
        gap: "4px",
      }}
      aria-label="Thinking"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: "var(--text-faint)",
            animation: `straw-ask-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes straw-ask-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
