"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Full-width gradient banner with an optional grain texture overlay.
 * Used for page heros (home greeting, task-detail title bar). The
 * grain is an inline SVG noise filter applied via ::before, so the
 * overall component is a single DOM node that themes correctly across
 * light / warm-dim / dark.
 */
interface HeroStripProps {
  /**
   * CSS gradient string. Defaults to a warm coral→peach pastel band
   * pulled from the orb tokens.
   */
  gradient?: string;
  /** Strip height in pixels. Defaults to 220. */
  height?: number;
  /** Whether to overlay an SVG grain texture. Defaults to true. */
  grain?: boolean;
  /** Opacity of the grain overlay (0..1). Defaults to 0.06. */
  grainOpacity?: number;
  /** Border-radius in pixels. Defaults to 12. */
  radius?: number;
  /** Inline content (title, CTAs, etc.). Padded inside the strip. */
  children?: ReactNode;
  /** Extra style overrides applied to the outer wrapper. */
  style?: CSSProperties;
  className?: string;
}

const DEFAULT_GRADIENT =
  "linear-gradient(135deg, var(--orb-coral) 0%, var(--orb-peach) 45%, var(--orb-beige) 100%)";

// 1×1 base64 SVG noise pattern. Encoded so we can inline it in CSS
// without spawning an extra HTTP request and without React having to
// parse the SVG.
const GRAIN_SVG_DATAURI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
       <filter id='n'>
         <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
         <feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'/>
       </filter>
       <rect width='100%' height='100%' filter='url(#n)'/>
     </svg>`,
  );

export function HeroStrip({
  gradient = DEFAULT_GRADIENT,
  height = 220,
  grain = true,
  grainOpacity = 0.06,
  radius = 12,
  children,
  style,
  className,
}: HeroStripProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: radius,
        background: gradient,
        overflow: "hidden",
        isolation: "isolate",
        ...style,
      }}
    >
      {/* Grain overlay — sits between the gradient and the content,
          mix-blend so it darkens highlights and lightens shadows. */}
      {grain && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("${GRAIN_SVG_DATAURI}")`,
            backgroundSize: "160px 160px",
            opacity: grainOpacity,
            mixBlendMode: "overlay",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}
      {/* Content sits above the grain. */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "32px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Curated gradient presets — each pulls from one or two of the six
 * pastel orbs. Use these as the `gradient` prop value for category
 * theming on task pages.
 */
export const HERO_GRADIENTS = {
  warmCoral:
    "linear-gradient(135deg, var(--orb-coral) 0%, var(--orb-peach) 45%, var(--orb-beige) 100%)",
  coolBlue:
    "linear-gradient(135deg, var(--orb-blue) 0%, var(--orb-lavender) 100%)",
  freshSage:
    "linear-gradient(135deg, var(--orb-sage) 0%, var(--orb-blue) 100%)",
  softBeige:
    "linear-gradient(135deg, var(--orb-beige) 0%, var(--orb-peach) 100%)",
  duskLavender:
    "linear-gradient(135deg, var(--orb-lavender) 0%, var(--orb-coral) 100%)",
  dawnPeach:
    "linear-gradient(135deg, var(--orb-peach) 0%, var(--orb-coral) 60%, var(--orb-lavender) 100%)",
} as const;

export type HeroGradientName = keyof typeof HERO_GRADIENTS;
