"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  AlertCircle,
  Check,
  Loader2,
  Plus,
  History,
  PanelRight,
  Mic,
  AudioLines,
} from "lucide-react";
import { useAskRail, ASK_RAIL_WIDTH, ASK_GUTTER } from "./ask-rail-context";

/**
 * AskRail — the full-height chat surface that hangs off the right
 * side of the dashboard when ask-mode is open. Replaces the older
 * dropdown ask-panel.
 *
 * Behaviors layered on top of the basic chat:
 *   1. Tool cards. When the model returns a `navigate` field in its
 *      structured response, the transcript inserts a "Navigating"
 *      pill (loader spin) → flips to ✓ once router.push fires and
 *      the page settles.
 *   2. Shimmer. While waiting for the model, a "Thinking…" line
 *      with a sweeping gradient shows that something is happening.
 *   3. Typewriter. Text replies aren't real-streamed (Gemini
 *      response is single-shot for now), but they reveal one
 *      character at a time so the surface feels alive.
 *
 * The rail itself is `position: fixed` because it lives outside the
 * inset dashboard frame and needs to stay anchored to the viewport.
 */

type ToolStatus = "running" | "done";

type Msg =
  | { kind: "user"; content: string }
  | { kind: "assistant"; content: string; animated?: boolean }
  | { kind: "tool"; label: string; status: ToolStatus };

const STARTERS = [
  "How do I get an API key?",
  "Where can I see my submissions?",
  "How does the eval pipeline work?",
];

export function AskRail() {
  const { open, setOpen } = useAskRail();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Autofocus when the rail opens; reset transcript on close so a
  // fresh open feels like "new chat", matching the screenshot.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setMessages([]);
      setInput("");
      setError(null);
      setThinking(false);
    }
  }, [open]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const userMsg: Msg = { kind: "user", content: trimmed };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setError(null);
    setThinking(true);

    try {
      // Convert local transcript to the wire format the route
      // expects (only user/assistant text turns; tool cards are UI
      // sugar that the model never sees).
      const wire = next
        .filter((m): m is Extract<Msg, { kind: "user" | "assistant" }> =>
          m.kind === "user" || m.kind === "assistant"
        )
        .map((m) => ({
          role: m.kind === "user" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        }));
      const res = await fetch("/api/dashboard/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: wire }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const j: { reply: string; navigate?: string | null } = await res.json();

      // Tool card path: navigation arrived. Insert running pill,
      // call router.push, settle, flip to ✓, THEN add the reply.
      if (j.navigate) {
        const path = j.navigate;
        setMessages((cur) => [...cur, { kind: "tool", label: "Navigating", status: "running" }]);
        // Small delay so the pill is visible before the route swap.
        await new Promise((r) => setTimeout(r, 150));
        router.push(path);
        // Give Next a beat to commit the navigation.
        await new Promise((r) => setTimeout(r, 500));
        setMessages((cur) => {
          // Flip the most-recent running tool card to done.
          const out = [...cur];
          for (let i = out.length - 1; i >= 0; i--) {
            const m = out[i];
            if (m.kind === "tool" && m.status === "running") {
              out[i] = { ...m, status: "done" };
              break;
            }
          }
          return out;
        });
      }

      setMessages((cur) => [
        ...cur,
        { kind: "assistant", content: j.reply, animated: true },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  if (!open) return null;

  return (
    <aside
      role="dialog"
      aria-label="Ask Straw"
      style={{
        position: "fixed",
        top: `${ASK_GUTTER}px`,
        right: `${ASK_GUTTER}px`,
        bottom: `${ASK_GUTTER}px`,
        width: `${ASK_RAIL_WIDTH}px`,
        background: "var(--bg-subtle)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header — left collapse-icon doubles as close (matches the
          ElevenLabs reference; no separate × button). */}
      <header
        style={{
          padding: "12px 12px 12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <IconButton aria-label="Close ask rail" onClick={() => setOpen(false)}>
            <PanelRight size={15} strokeWidth={2} aria-hidden="true" />
          </IconButton>
          <h2
            className="font-sans"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text)",
              margin: 0,
              letterSpacing: "-0.005em",
            }}
          >
            New chat
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <IconButton aria-label="New chat" onClick={() => setMessages([])}>
            <Plus size={15} strokeWidth={2} aria-hidden="true" />
          </IconButton>
          <IconButton aria-label="History (coming soon)" disabled>
            <History size={15} strokeWidth={2} aria-hidden="true" />
          </IconButton>
        </div>
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
          gap: "10px",
        }}
      >
        <p
          className="font-sans"
          style={{ fontSize: "13px", color: "var(--text)", margin: 0, lineHeight: 1.5 }}
        >
          Hi! How can I help you today?
        </p>

        {messages.length === 0 && !thinking && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
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
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-strong)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => {
          if (m.kind === "user") return <UserBubble key={i} text={m.content} />;
          if (m.kind === "tool") return <ToolPill key={i} label={m.label} status={m.status} />;
          return <AssistantBubble key={i} text={m.content} animate={m.animated ?? false} />;
        })}

        {thinking && <Shimmer text="Thinking…" />}

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
            <p className="font-sans" style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Composer — single padded box with the textarea on top and a
          row of action icons (mic + waveform-send) along the bottom-
          right, matching the ElevenLabs reference. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{
          margin: "12px",
          padding: "10px 10px 8px 12px",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          background: "var(--bg-card)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder="Ask anything…"
          className="font-sans straw-ask-textarea"
          style={{
            width: "100%",
            resize: "none",
            fontSize: "13px",
            lineHeight: 1.5,
            color: "var(--text)",
            background: "transparent",
            border: "none",
            outline: "none",
            boxShadow: "none",
            padding: 0,
            maxHeight: "140px",
          }}
        />
        <style>{`
          .straw-ask-textarea:focus,
          .straw-ask-textarea:focus-visible {
            outline: none !important;
            box-shadow: none !important;
            border: none !important;
          }
        `}</style>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "4px" }}>
          <IconButton aria-label="Voice input (coming soon)" disabled>
            <Mic size={14} strokeWidth={2} aria-hidden="true" />
          </IconButton>
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "26px",
              height: "26px",
              borderRadius: "999px",
              background:
                input.trim() && !thinking ? "var(--text)" : "var(--bg-strong)",
              color:
                input.trim() && !thinking ? "var(--inverse-text)" : "var(--text-faint)",
              border: "none",
              cursor: input.trim() && !thinking ? "pointer" : "not-allowed",
              transition: "background-color 0.12s ease, color 0.12s ease",
              flexShrink: 0,
            }}
          >
            <AudioLines size={13} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </form>
    </aside>
  );
}

/* ─────────── sub-components ─────────── */

function IconButton({
  children,
  onClick,
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
} & React.AriaAttributes) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "26px",
        height: "26px",
        borderRadius: "6px",
        background: "transparent",
        color: "var(--text-muted)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background-color 0.12s ease, color 0.12s ease",
      }}
      onMouseOver={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "var(--bg-subtle)";
        e.currentTarget.style.color = "var(--text)";
      }}
      onMouseOut={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        alignSelf: "flex-end",
        maxWidth: "85%",
        padding: "8px 12px",
        borderRadius: "12px 12px 2px 12px",
        background: "var(--bg-strong)",
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
        {text}
      </p>
    </div>
  );
}

function AssistantBubble({ text, animate }: { text: string; animate: boolean }) {
  const shown = useTypewriter(text, animate ? 12 : 0);
  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "100%" }}>
      <p
        className="font-sans"
        style={{
          margin: 0,
          fontSize: "13px",
          lineHeight: 1.6,
          color: "var(--text)",
          whiteSpace: "pre-wrap",
        }}
      >
        {shown}
      </p>
    </div>
  );
}

function ToolPill({ label, status }: { label: string; status: ToolStatus }) {
  return (
    <div
      style={{
        alignSelf: "stretch",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        borderRadius: "var(--radius)",
        background: "var(--bg-subtle)",
        border: "1px solid var(--border)",
      }}
    >
      {status === "running" ? (
        <Loader2
          size={13}
          strokeWidth={2}
          aria-hidden="true"
          style={{
            color: "var(--text-muted)",
            animation: "straw-spin 1s linear infinite",
            flexShrink: 0,
          }}
        />
      ) : (
        <Check
          size={13}
          strokeWidth={2.5}
          aria-hidden="true"
          style={{ color: "#3a8a3a", flexShrink: 0 }}
        />
      )}
      <span
        className="font-sans"
        style={{
          fontSize: "12px",
          color: status === "running" ? "var(--text-muted)" : "var(--text)",
        }}
      >
        {label}
      </span>
      <style>{`
        @keyframes straw-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function Shimmer({ text }: { text: string }) {
  return (
    <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px" }}>
      <Sparkles
        size={13}
        strokeWidth={2}
        aria-hidden="true"
        style={{ color: "var(--text-muted)" }}
      />
      <span
        className="font-sans"
        style={{
          fontSize: "13px",
          backgroundImage:
            "linear-gradient(90deg, var(--text-faint) 0%, var(--text) 30%, var(--text-faint) 60%, var(--text-faint) 100%)",
          backgroundSize: "200% 100%",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
          animation: "straw-shimmer 1.6s linear infinite",
        }}
      >
        {text}
      </span>
      <style>{`
        @keyframes straw-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

/**
 * Reveals `text` character-by-character at the given step interval.
 * `stepMs <= 0` short-circuits to immediate display.
 */
function useTypewriter(text: string, stepMs: number): string {
  const [shown, setShown] = useState(stepMs > 0 ? "" : text);
  useEffect(() => {
    if (stepMs <= 0) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, stepMs);
    return () => clearInterval(id);
  }, [text, stepMs]);
  return shown;
}
