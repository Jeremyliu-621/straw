"use client";

import Link from "next/link";
import type { ComponentType } from "react";

/**
 * Square tool card — illustration on top, label below. Modeled on
 * the ElevenLabs home tool-card row (Instant speech / Audiobook /
 * Image & Video / etc.). Either `imageSrc` (raster) or `Illustration`
 * (SVG component) drives the upper portion.
 *
 * Hover animation: the whole card lifts (translateY -2) and the
 * illustration inside scales up slightly (1 → 1.06). Both transitions
 * are tuned short and ease-out so the effect reads as "alive" rather
 * than "loaded a video on my page" — matches the ElevenLabs feel.
 */
interface ToolCardProps {
  label: string;
  href: string;
  /** Path to a raster image under /public. Mutually exclusive with `Illustration`. */
  imageSrc?: string;
  /** Inline SVG illustration component. Mutually exclusive with `imageSrc`. */
  Illustration?: ComponentType<{ className?: string }>;
  /**
   * Which tint token to use as the card's background. Defaults to
   * tint-beige. Theming is automatic via CSS vars.
   */
  tint?:
    | "tint-peach"
    | "tint-lavender"
    | "tint-blue"
    | "tint-beige"
    | "tint-coral"
    | "tint-sage";
  description?: string;
}

export function ToolCard({
  label,
  href,
  imageSrc,
  Illustration,
  tint = "tint-beige",
  description,
}: ToolCardProps) {
  return (
    <Link
      href={href}
      className="font-sans block group"
      style={{
        position: "relative",
        background: `var(--${tint})`,
        border: "1px solid var(--border)",
        // Match the rest of the app — sidebar buttons, top-bar pills,
        // section containers all use var(--radius). Was hardcoded 12px.
        borderRadius: "var(--radius)",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        aspectRatio: "1 / 1",
        transition:
          "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.08)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Illustration area — upper 65% of the card. The inner
          .tool-card-art element scales on parent hover via the
          `group-hover:` Tailwind variant — keeps the animation
          declarative and avoids ref juggling. */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          minHeight: 0,
        }}
      >
        <div
          className="tool-card-art transition-transform duration-300 ease-out group-hover:scale-[1.06]"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
          }}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              style={{
                maxWidth: "82%",
                maxHeight: "82%",
                objectFit: "contain",
              }}
            />
          ) : Illustration ? (
            <Illustration className="w-[70%] h-auto max-h-[70%]" />
          ) : null}
        </div>
      </div>
      {/* Label area — lower portion, slightly pushed-back background */}
      <div
        style={{
          padding: "12px 16px 14px",
          background: "var(--bg-card)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text)",
            lineHeight: 1.3,
          }}
        >
          {label}
        </p>
        {description && (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: "var(--text-muted)",
              lineHeight: 1.35,
            }}
          >
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}
