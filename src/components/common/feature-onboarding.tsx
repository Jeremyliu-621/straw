"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * First-visit feature-intro modal — modeled on the ElevenLabs Flows /
 * Sound Effects / Image & Video popups (see
 * tasks/design/elevenlabs-references/04, 06, 08).
 *
 * One per page. Mounts, checks localStorage, opens if unseen, persists
 * the seen flag on dismiss. Multi-step flow goes through the heavier
 * `OnboardingModal` instead — this is the lightweight "here's what
 * this page is" affordance.
 */
interface FeatureOnboardingProps {
  /** Stable ID. localStorage key = `straw:fonboarded:<id>`. */
  id: string;
  title: string;
  /** Three short bullets — keep each under ~10 words. */
  bullets: string[];
  /** Primary CTA label. Defaults to "Get started". */
  ctaLabel?: string;
  /** Called when user clicks the CTA. Defaults to dismissing. */
  onCta?: () => void;
  /** Hero image at the top of the modal (path under /public). */
  mediaSrc?: string;
  /** Hero gradient (used when no `mediaSrc`). */
  mediaGradient?: string;
}

const STORAGE_PREFIX = "straw:fonboarded:";

function storageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

export function FeatureOnboarding({
  id,
  title,
  bullets,
  ctaLabel = "Get started",
  onCta,
  mediaSrc,
  mediaGradient = "linear-gradient(135deg, var(--orb-coral) 0%, var(--orb-peach) 50%, var(--orb-lavender) 100%)",
}: FeatureOnboardingProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(storageKey(id));
      if (!seen) setOpen(true);
    } catch {
      // localStorage may be blocked — render the page without the modal
    }
  }, [id]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey(id), String(Date.now()));
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const handleCta = () => {
    onCta?.();
    dismiss();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`fonboarding-title-${id}`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "min(560px, calc(100vw - 32px))",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
              overflow: "hidden",
            }}
          >
            {/* Hero — image OR gradient */}
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 9",
                background: mediaSrc ? "var(--bg-subtle)" : mediaGradient,
                overflow: "hidden",
              }}
            >
              {mediaSrc && (
                <img
                  src={mediaSrc}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              )}
              {/* Close (X) — sits over the hero */}
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="flex items-center justify-center"
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  border: "none",
                  color: "#2a1f12",
                  cursor: "pointer",
                }}
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 28px 24px" }}>
              <h2
                id={`fonboarding-title-${id}`}
                className="font-sans"
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: 1.25,
                }}
              >
                {title}
              </h2>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "16px 0 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {bullets.map((b, i) => (
                  <li
                    key={i}
                    className="font-sans"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 14,
                      color: "var(--text-body)",
                      lineHeight: 1.45,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        flexShrink: 0,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--accent-subtle)",
                        color: "var(--text)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 1,
                      }}
                    >
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div style={{ marginTop: 22 }}>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleCta}
                >
                  {ctaLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
