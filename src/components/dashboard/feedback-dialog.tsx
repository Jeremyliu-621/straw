"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Mail, Github, Linkedin, Twitter, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SOCIALS = [
  { label: "Email", href: "mailto:hello@straw.wiki?subject=Straw%20feedback", icon: Mail },
  { label: "X", href: "https://x.com/jeremyliuljj", icon: Twitter },
  { label: "GitHub", href: "https://github.com/jeremyliu-621", icon: Github },
  { label: "LinkedIn", href: "https://linkedin.com/in/jmyl", icon: Linkedin },
] as const;

/**
 * FeedbackDropdown — small popover that drops from the TopBar Feedback
 * button. Textarea + Send + a row of social-icon links to reach out
 * directly. No card-style options, no contact-method radios — just the
 * essentials.
 */
export function FeedbackDropdown({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSend = message.trim().length >= 3 && !submitting;

  async function handleSend() {
    if (!canSend) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error?.message ?? "Failed to send feedback");
      }
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Send feedback"
      className="font-sans"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        width: "320px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
        zIndex: 40,
        padding: "12px",
      }}
    >
      {done ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "16px 4px",
            color: "var(--text)",
            fontSize: "13px",
          }}
        >
          <CheckCircle2 size={16} strokeWidth={2} style={{ color: "#16a34a" }} aria-hidden="true" />
          <span>Got it — thanks.</span>
        </div>
      ) : (
        <>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Bug? Idea? Confusing flow? Spill it."
            rows={4}
            maxLength={4000}
            disabled={submitting}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{
              width: "100%",
              resize: "vertical",
              minHeight: "88px",
              padding: "9px 10px",
              fontSize: "13px",
              lineHeight: 1.5,
              fontFamily: "inherit",
              color: "var(--text)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              outline: "none",
              transition: "border-color 0.12s ease",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--text-faint)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />

          {error && (
            <p
              role="alert"
              style={{
                margin: "8px 0 0",
                color: "#b91c1c",
                fontSize: "11.5px",
              }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              marginTop: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                  aria-label={label}
                  title={label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    borderRadius: "var(--radius)",
                    color: "var(--text-muted)",
                    transition: "background-color 0.12s ease, color 0.12s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "var(--bg-subtle)";
                    e.currentTarget.style.color = "var(--text)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  <Icon size={14} strokeWidth={2} aria-hidden="true" />
                </a>
              ))}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              disabled={!canSend}
              leadingIcon={<Send size={12} strokeWidth={2} />}
            >
              {submitting ? "Sending…" : "Send"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
