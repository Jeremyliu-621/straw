"use client";

import Link from "next/link";
import type { ComponentType } from "react";

/**
 * Square tool card — illustration on top, label below. Modeled on
 * the ElevenLabs home tool-card row (Instant speech / Audiobook /
 * Image & Video / etc.). Either `imageSrc` (raster) or `Illustration`
 * (SVG component) drives the upper portion.
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
      className="font-sans block"
      style={{
        position: "relative",
        background: `var(--${tint})`,
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        aspectRatio: "1 / 1",
        transition:
          "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 22px rgba(0,0,0,0.06)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Illustration area — upper 65% of the card */}
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
