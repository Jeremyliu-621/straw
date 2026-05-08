"use client";

import Link from "next/link";
import type { ComponentType } from "react";

/**
 * Square tool card — illustration in a gray square, label text underneath.
 * Modeled on ElevenLabs' home tool-card row: the card is just the visual
 * container, the label lives outside below it.
 */
interface ToolCardProps {
  label: string;
  href: string;
  /** Path under /public to the rest-state raster image. */
  imageSrc?: string;
  /** Path under /public to the hover-state raster image. Crossfades with imageSrc on hover. */
  imageHoverSrc?: string;
  /** Inline SVG illustration component. Mutually exclusive with imageSrc. */
  Illustration?: ComponentType<{ className?: string }>;
  /** Unused — kept for call-site compatibility. */
  tint?: string;
  description?: string;
}

export function ToolCard({
  label,
  href,
  imageSrc,
  imageHoverSrc,
  Illustration,
  description,
}: ToolCardProps) {
  return (
    <Link
      href={href}
      className="font-sans block group"
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
      {/* Illustration square */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          background: "var(--bg-subtle)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.18s ease, box-shadow 0.18s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.06)";
          e.currentTarget.style.borderColor = "var(--border-strong)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        {imageSrc && imageHoverSrc ? (
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
          <img
            src={imageSrc}
            alt=""
            style={{ maxWidth: "72%", maxHeight: "72%", objectFit: "contain" }}
          />
        ) : Illustration ? (
          <Illustration className="w-[72%] h-auto max-h-[72%] transition-transform duration-300 ease-out group-hover:scale-105" />
        ) : null}
      </div>

      {/* Label — below the card */}
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
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
