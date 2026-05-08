"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Loader2,
  Plus,
  History,
  PanelLeft,
  Mic,
  X,
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

interface DocSource {
  slug: string;
  title: string;
}

type Msg =
  | { kind: "user"; content: string }
  | { kind: "assistant"; content: string; animated?: boolean; sources?: DocSource[] }
  | { kind: "tool"; label: string; status: ToolStatus };

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: Msg[];
}

const STARTERS = [
  "How do I get an API key?",
  "Where can I see my submissions?",
  "How does the eval pipeline work?",
];

const HISTORY_KEY = "straw:ask-history";
const HISTORY_CAP = 50;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(messages: Msg[]): string {
  const firstUser = messages.find((m): m is Extract<Msg, { kind: "user" }> => m.kind === "user");
  if (!firstUser) return "Untitled chat";
  const t = firstUser.content.trim().split("\n")[0];
  return t.length > 60 ? t.slice(0, 57) + "…" : t;
}

function relativeShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w === 1 ? "" : "s"} ago`;
  const mo = Math.floor(d / 30);
  return `${mo} month${mo === 1 ? "" : "s"} ago`;
}

/* ─────────── Web Speech API typing (lib.dom doesn't ship the
   webkit-prefixed constructor, so we narrow to what we actually
   use). Falls back gracefully if the API isn't available. ─────── */
interface SpeechResultAlt {
  transcript: string;
}
interface SpeechResult {
  isFinal: boolean;
  0: SpeechResultAlt;
  length: number;
}
interface SpeechResultList {
  length: number;
  [index: number]: SpeechResult;
}
interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechResultList;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance;
}
function getSpeechCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AskRail() {
  const { open, setOpen } = useAskRail();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [currentId, setCurrentId] = useState<string>(() => newId());
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputAtVoiceStart = useRef<string>("");

  // Load persisted history on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHistory(parsed as ChatSession[]);
        }
      }
    } catch {
      // localStorage may be blocked; just start with an empty list.
    }
  }, []);

  // Persist whenever history changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  /**
   * Move the current chat (if it has any messages) into the history
   * list under the same id. Used before swapping to a new chat or
   * loading an old one. Idempotent: re-archiving updates in place
   * rather than appending duplicates.
   */
  const archiveCurrent = useCallback(() => {
    setHistory((prev) => {
      if (messages.length === 0) return prev;
      const session: ChatSession = {
        id: currentId,
        title: deriveTitle(messages),
        updatedAt: new Date().toISOString(),
        // Strip the typewriter `animated` flag so reloading an
        // archived chat doesn't replay the animation.
        messages: messages.map((m) =>
          m.kind === "assistant" ? { ...m, animated: false } : m
        ),
      };
      const filtered = prev.filter((s) => s.id !== currentId);
      return [session, ...filtered].slice(0, HISTORY_CAP);
    });
  }, [messages, currentId]);

  const startNewChat = useCallback(() => {
    archiveCurrent();
    setMessages([]);
    setCurrentId(newId());
    setError(null);
    setInput("");
    setHistoryOpen(false);
    inputRef.current?.focus();
  }, [archiveCurrent]);

  const loadSession = useCallback(
    (s: ChatSession) => {
      archiveCurrent();
      setMessages(s.messages.map((m) => (m.kind === "assistant" ? { ...m, animated: false } : m)));
      setCurrentId(s.id);
      setError(null);
      setInput("");
      setHistoryOpen(false);
      inputRef.current?.focus();
    },
    [archiveCurrent]
  );

  const deleteSession = useCallback((id: string) => {
    setHistory((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Autofocus when the rail opens; archive + reset on close so the
  // next open starts a fresh chat (history persists through close).
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      // Archive any in-progress chat before clearing.
      archiveCurrent();
      setMessages([]);
      setCurrentId(newId());
      setInput("");
      setError(null);
      setThinking(false);
      setHistoryOpen(false);
      // Stop any in-flight voice recognition.
      recRef.current?.abort();
      recRef.current = null;
      setListening(false);
    }
    // archiveCurrent is intentionally excluded: capturing it stale
    // here is fine, we only care about the current snapshot at the
    // moment of close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  /**
   * Voice-to-text via the Web Speech API. Appends the live
   * transcript to whatever the user had already typed (so dictating
   * mid-sentence doesn't blow away the existing input). Click the
   * mic again to stop early; otherwise auto-stops on silence.
   *
   * We call getUserMedia({audio:true}) before starting recognition
   * so Chrome surfaces its standard permission prompt instead of
   * letting SpeechRecognition silently fail with `not-allowed` when
   * the user has previously dismissed (not denied) the prompt.
   */
  async function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      setError("Voice input isn't available in this browser. Try Chrome or Edge.");
      return;
    }

    // Permission preflight. Granting also lights up the mic icon in
    // the URL bar so the user can revoke later. We immediately
    // release the audio tracks; SpeechRecognition manages its own.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError(
          "Microphone is blocked for this site. Click the tune/lock icon in the address bar → Site settings → Microphone → Allow, then reload."
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No microphone detected on this device.");
      } else {
        setError(err instanceof Error ? err.message : "Couldn't access the microphone.");
      }
      return;
    }

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    inputAtVoiceStart.current = input;

    rec.onresult = (e) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      const base = inputAtVoiceStart.current;
      setInput(base ? `${base.replace(/\s+$/, "")} ${transcript}` : transcript);
    };
    rec.onerror = (ev) => {
      // Map the SpeechRecognition error codes to actionable copy.
      // Spec'd values: not-allowed, service-not-allowed, no-speech,
      // audio-capture, network, aborted, bad-grammar, language-not-
      // supported.
      const code = ev.error;
      let msg: string;
      switch (code) {
        case "not-allowed":
        case "service-not-allowed":
          msg =
            "Microphone is blocked for this site. Click the tune/lock icon in the address bar → Site settings → Microphone → Allow, then reload.";
          break;
        case "no-speech":
          msg = "Didn't catch any speech. Try again.";
          break;
        case "audio-capture":
          msg = "No microphone detected on this device.";
          break;
        case "network":
          msg = "Chrome couldn't reach the speech service. Check your connection.";
          break;
        case "aborted":
          // User stopped it themselves; no error UI.
          msg = "";
          break;
        default:
          msg = `Voice error: ${code}`;
      }
      if (msg) setError(msg);
      setListening(false);
      recRef.current = null;
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      inputRef.current?.focus();
    };

    recRef.current = rec;
    setListening(true);
    setError(null);
    try {
      rec.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start voice input.");
      setListening(false);
      recRef.current = null;
    }
  }

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
      const j: {
        reply: string;
        navigate?: string | null;
        sources?: DocSource[];
      } = await res.json();

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
        {
          kind: "assistant",
          content: j.reply,
          animated: true,
          sources: j.sources && j.sources.length > 0 ? j.sources : undefined,
        },
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
          {/* Bare panel-collapse glyph — no border, no bg pill. Click
              closes the rail. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close ask rail"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
              padding: 0,
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "color 0.12s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <PanelLeft size={16} strokeWidth={2} aria-hidden="true" />
          </button>
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
          <IconButton aria-label="New chat" onClick={startNewChat}>
            <Plus size={15} strokeWidth={2} aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label="Chat history"
            aria-pressed={historyOpen}
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <History size={15} strokeWidth={2} aria-hidden="true" />
          </IconButton>
        </div>
      </header>

      {historyOpen && (
        <HistoryOverlay
          history={history}
          onClose={() => setHistoryOpen(false)}
          onSelect={loadSession}
          onDelete={deleteSession}
        />
      )}

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
          return (
            <AssistantBubble
              key={i}
              text={m.content}
              animate={m.animated ?? false}
              sources={m.sources}
            />
          );
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
          <IconButton
            aria-label={listening ? "Stop voice input" : "Voice input"}
            onClick={toggleVoice}
          >
            <Mic
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              style={{
                color: listening ? "var(--cta)" : undefined,
              }}
            />
          </IconButton>
          {/* Hidden submit button so Enter still triggers form submit
              for keyboard users; kept off-screen rather than removed
              entirely since native form submission needs *some* type
              ="submit" element. */}
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-hidden="true"
            tabIndex={-1}
            style={{
              position: "absolute",
              left: "-10000px",
              width: "1px",
              height: "1px",
              opacity: 0,
              pointerEvents: "none",
            }}
          />
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

function HistoryOverlay({
  history,
  onClose,
  onSelect,
  onDelete,
}: {
  history: ChatSession[];
  onClose: () => void;
  onSelect: (s: ChatSession) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Chat history"
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg-subtle)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "12px 12px 12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
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
          Chat History
        </h2>
        <IconButton aria-label="Close history" onClick={onClose}>
          <X size={15} strokeWidth={2} aria-hidden="true" />
        </IconButton>
      </header>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
        }}
      >
        {history.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <p
              className="font-sans"
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              No chats yet.
            </p>
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {history.map((s) => (
              <HistoryRow
                key={s.id}
                session={s}
                onSelect={() => onSelect(s)}
                onDelete={() => onDelete(s.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  session,
  onSelect,
  onDelete,
}: {
  session: ChatSession;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <li>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: "relative",
          padding: "10px 12px",
          borderRadius: "8px",
          background: hover ? "var(--bg-strong)" : "transparent",
          transition: "background-color 0.12s ease",
        }}
      >
        <button
          type="button"
          onClick={onSelect}
          className="font-sans"
          style={{
            width: "100%",
            textAlign: "left",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text)",
              lineHeight: 1.35,
              // Reserve room for the trash button on hover so the
              // title doesn't reflow when the icon appears.
              paddingRight: "20px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {session.title}
          </p>
          <p
            style={{
              margin: "2px 0 0 0",
              fontSize: "11px",
              color: "var(--text-faint)",
              fontVariantNumeric: "tabular-nums" as const,
            }}
          >
            {relativeShort(session.updatedAt)}
          </p>
        </button>
        {hover && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete chat"
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              color: "var(--text-faint)",
              cursor: "pointer",
              borderRadius: "4px",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "var(--text-faint)";
            }}
          >
            <X size={13} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
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

function AssistantBubble({
  text,
  animate,
  sources,
}: {
  text: string;
  animate: boolean;
  sources?: DocSource[];
}) {
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
      {sources && sources.length > 0 && (
        <div
          className="font-sans"
          style={{
            marginTop: "8px",
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 6px",
            alignItems: "center",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ color: "var(--text-faint)" }}>From the docs:</span>
          {sources.map((s) => (
            <a
              key={s.slug}
              href={`/docs/${s.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "1px 6px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                color: "var(--text-muted)",
                textDecoration: "none",
                transition: "color 0.15s ease, background 0.15s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "var(--bg-card)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "var(--bg-subtle)";
              }}
            >
              {s.title}
            </a>
          ))}
        </div>
      )}
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
    <div style={{ alignSelf: "flex-start" }}>
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
