"use client";

import Link from "next/link";
import type { ComponentType } from "react";

/**
 * Square tool card — illustration on top, label below. Modeled on
 * the ElevenLabs home tool-card row.
 *
 * Hover animation: when both `imageSrc` and `imageHoverSrc` are
 * provided, the two images crossfade on hover (rest opacity 1→0,
 * hover opacity 0→1, both 300ms ease-out). This is exactly how
 * ElevenLabs' tool cards work — the same elements just rearranged
 * between the two states (see tasks/design/illustration-prompts.md).
 *
 * If only `Illustration` (an SVG component) is provided, no hover
 * animation runs — the SVG is the rest and that's it. SVG components
 * can implement their own internal animations using CSS group-hover
 * if they want.
 */
interface ToolCardProps {
  label: string;
  href: string;
  /** Path under /public to the rest-state raster image. */
  imageSrc?: string;
  /** Path under /public to the hover-state raster image. Crossfades
      with imageSrc on hover. Optional. */
  imageHoverSrc?: string;
  /** Inline SVG illustration component. Mutually exclusive with imageSrc. */
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
  imageHoverSrc,
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
        borderRadius: "var(--radius)",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        aspectRatio: "1 / 1",
        transition: "box-shadow 0.18s ease, border-color 0.18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.05)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Illustration area — upper portion of the card. */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          minHeight: 0,
        }}
      >
        {imageSrc && imageHoverSrc ? (
          // Two-image crossfade (ElevenLabs pattern). Both images
          // overlap; the hover one is invisible until parent :hover
          // fires, then opacity flips on a 300ms ease-out.
          <>
            <img
              src={imageSrc}
              alt=""
              className="transition-opacity duration-300 ease-out group-hover:opacity-0"
              style={{
                position: "absolute",
                inset: 16,
                width: "calc(100% - 32px)",
                height: "calc(100% - 32px)",
                objectFit: "contain",
                opacity: 1,
              }}
            />
            <img
              src={imageHoverSrc}
              alt=""
              className="transition-opacity duration-300 ease-out opacity-0 group-hover:opacity-100"
              style={{
                position: "absolute",
                inset: 16,
                width: "calc(100% - 32px)",
                height: "calc(100% - 32px)",
                objectFit: "contain",
              }}
            />
          </>
        ) : imageSrc ? (
          // Single raster — no hover animation.
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
          <Illustration className="w-[92%] h-auto max-h-[92%]" />
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
