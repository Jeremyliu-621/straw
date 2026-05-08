// Tool-card illustrations — twelve inline SVGs (200×200) for the
// dashboard home pages. Each one uses linear/radial gradients on the
// main shapes plus a soft inline drop shadow for a "3D sticker" feel
// closer to the ElevenLabs reference. All shapes pulled from the same
// pastel palette as the orb / tint tokens.

import * as React from "react";

interface IllustrationProps {
  className?: string;
}

const COLORS = {
  coral: "#ecd0cc",
  coralDeep: "#e87a6f",
  blue: "#cfd5e8",
  blueDeep: "#7d8fb5",
  sage: "#d0d7d1",
  sageDeep: "#88b896",
  beige: "#e0d6d0",
  peach: "#f7d4d0",
  peachDeep: "#f0a890",
  lavender: "#d9d4f6",
  lavenderDeep: "#8a7dc4",
  ink: "#2a1f12",
  inkSoft: "#5a4d3d",
  paper: "#faf6ef",
};

function svgProps(className?: string): React.SVGProps<SVGSVGElement> {
  return {
    viewBox: "0 0 200 200",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    "aria-hidden": true,
  };
}

/**
 * One small inline filter that every illustration shares. Renders a
 * soft drop shadow under whatever element it's applied to.
 *
 * IMPORTANT: filter IDs must be unique per page render. Each
 * illustration adds its own copy in <defs> with its own id.
 */
function softShadowFilter(id: string) {
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
      <feOffset dy="2.5" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.18" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

// ─── Agent dashboard ────────────────────────────────────────────────

/** Concentric arena rings with a small 3D agent figure in the center. */
export function ArenaIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("arena-shadow")}
        <radialGradient id="arena-ring-outer" cx="50%" cy="35%">
          <stop offset="0%" stopColor="#f7e0db" />
          <stop offset="100%" stopColor={COLORS.coral} />
        </radialGradient>
        <radialGradient id="arena-ring-inner" cx="50%" cy="35%">
          <stop offset="0%" stopColor="#ffeae3" />
          <stop offset="100%" stopColor={COLORS.peach} />
        </radialGradient>
        <radialGradient id="arena-figure" cx="40%" cy="25%">
          <stop offset="0%" stopColor="#5e4534" />
          <stop offset="100%" stopColor={COLORS.ink} />
        </radialGradient>
      </defs>
      {/* Floor shadow on the surface */}
      <ellipse cx="100" cy="160" rx="78" ry="8" fill="#000" opacity="0.06" />
      {/* Outer ring */}
      <g filter="url(#arena-shadow)">
        <ellipse cx="100" cy="124" rx="76" ry="22" fill="url(#arena-ring-outer)" />
      </g>
      {/* Middle ring */}
      <ellipse cx="100" cy="120" rx="60" ry="17" fill="url(#arena-ring-inner)" />
      {/* Inner spotlight */}
      <ellipse cx="100" cy="118" rx="42" ry="11" fill="#fff5ef" opacity="0.7" />
      {/* Figure shadow */}
      <ellipse cx="100" cy="116" rx="11" ry="2.5" fill="#000" opacity="0.2" />
      {/* Figure body */}
      <g filter="url(#arena-shadow)">
        <rect x="94" y="80" width="12" height="36" rx="6" fill="url(#arena-figure)" />
        <circle cx="100" cy="78" r="10" fill="url(#arena-figure)" />
      </g>
      {/* Highlight on head */}
      <ellipse cx="96" cy="74" rx="3.5" ry="2.5" fill="#fff" opacity="0.28" />
    </svg>
  );
}

/** Wrapped parcel mid-flight with ribbon, shadow, motion trace. */
export function SubmissionIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("submission-shadow")}
        <linearGradient id="submission-box" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0e7e0" />
          <stop offset="100%" stopColor={COLORS.beige} />
        </linearGradient>
        <linearGradient id="submission-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5dcd6" />
          <stop offset="100%" stopColor={COLORS.coralDeep} />
        </linearGradient>
      </defs>
      {/* Motion swooshes */}
      <path d="M 24 144 Q 60 138 88 148" fill="none" stroke={COLORS.coral} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <path d="M 30 156 Q 58 152 80 160" fill="none" stroke={COLORS.peach} strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
      {/* Floor shadow under parcel */}
      <ellipse cx="106" cy="148" rx="46" ry="6" fill="#000" opacity="0.1" />
      {/* Box */}
      <g filter="url(#submission-shadow)">
        <rect x="56" y="58" width="92" height="78" rx="6" fill="url(#submission-box)" />
        {/* Vertical ribbon */}
        <rect x="92" y="58" width="14" height="78" fill="url(#submission-ribbon)" />
        {/* Horizontal ribbon */}
        <rect x="56" y="86" width="92" height="14" fill="url(#submission-ribbon)" />
        {/* Knot */}
        <circle cx="99" cy="93" r="10" fill={COLORS.coralDeep} />
        <circle cx="99" cy="93" r="10" fill="url(#submission-ribbon)" opacity="0.4" />
      </g>
      {/* Highlight on box top edge */}
      <rect x="58" y="60" width="88" height="2" rx="1" fill="#fff" opacity="0.5" />
      {/* Sparkle */}
      <circle cx="156" cy="48" r="3" fill={COLORS.peachDeep} />
      <circle cx="166" cy="62" r="1.6" fill={COLORS.peachDeep} />
    </svg>
  );
}

/** A 3D medal with a ribbon and orbiting sparkles. */
export function ReputationIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("rep-shadow")}
        <radialGradient id="rep-medal-outer" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#f6e6e2" />
          <stop offset="100%" stopColor={COLORS.coralDeep} />
        </radialGradient>
        <radialGradient id="rep-medal-inner" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fff0e8" />
          <stop offset="100%" stopColor={COLORS.peach} />
        </radialGradient>
        <linearGradient id="rep-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.coralDeep} />
          <stop offset="100%" stopColor="#bf5145" />
        </linearGradient>
      </defs>
      {/* Floor shadow */}
      <ellipse cx="100" cy="172" rx="40" ry="5" fill="#000" opacity="0.1" />
      {/* Ribbon */}
      <path d="M 86 120 L 76 168 L 100 156 L 124 168 L 114 120 Z" fill="url(#rep-ribbon)" />
      <path d="M 86 120 L 100 138 L 114 120 Z" fill="#000" opacity="0.12" />
      {/* Medal outer ring */}
      <g filter="url(#rep-shadow)">
        <circle cx="100" cy="100" r="32" fill="url(#rep-medal-outer)" />
        <circle cx="100" cy="100" r="22" fill="url(#rep-medal-inner)" />
      </g>
      {/* Medal star/symbol — simple 5-point */}
      <path
        d="M 100 86 L 104 96 L 114 96 L 106 102 L 110 112 L 100 106 L 90 112 L 94 102 L 86 96 L 96 96 Z"
        fill={COLORS.coralDeep}
      />
      {/* Highlight on medal */}
      <ellipse cx="92" cy="92" rx="6" ry="4" fill="#fff" opacity="0.5" />
      {/* Sparkles */}
      <circle cx="50" cy="62" r="2.5" fill={COLORS.lavenderDeep} />
      <circle cx="158" cy="56" r="3" fill={COLORS.lavenderDeep} />
      <circle cx="170" cy="92" r="1.8" fill={COLORS.lavenderDeep} />
    </svg>
  );
}

/** A neat stack of pastel coins with a sparkle floating above. */
export function EarningsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("coin-shadow")}
        <linearGradient id="coin-bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbe6e0" />
          <stop offset="100%" stopColor={COLORS.peach} />
        </linearGradient>
        <linearGradient id="coin-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde8e2" />
          <stop offset="100%" stopColor={COLORS.coral} />
        </linearGradient>
      </defs>
      {/* Floor shadow */}
      <ellipse cx="100" cy="160" rx="50" ry="6" fill="#000" opacity="0.1" />
      {/* Coin 1 (bottom) */}
      <g filter="url(#coin-shadow)">
        <ellipse cx="100" cy="146" rx="46" ry="11" fill={COLORS.coralDeep} />
        <ellipse cx="100" cy="142" rx="46" ry="11" fill="url(#coin-bottom)" />
      </g>
      {/* Coin 2 */}
      <g filter="url(#coin-shadow)">
        <ellipse cx="100" cy="120" rx="42" ry="10" fill={COLORS.coralDeep} />
        <ellipse cx="100" cy="116" rx="42" ry="10" fill="url(#coin-mid)" />
      </g>
      {/* Coin 3 (top) */}
      <g filter="url(#coin-shadow)">
        <ellipse cx="100" cy="92" rx="38" ry="9" fill={COLORS.coralDeep} />
        <ellipse cx="100" cy="88" rx="38" ry="9" fill="url(#coin-bottom)" />
      </g>
      {/* Highlight on top coin */}
      <ellipse cx="86" cy="84" rx="14" ry="2" fill="#fff" opacity="0.55" />
      {/* Sparkle */}
      <path
        d="M 144 50 L 147 60 L 157 63 L 147 66 L 144 76 L 141 66 L 131 63 L 141 60 Z"
        fill={COLORS.lavenderDeep}
      />
    </svg>
  );
}

/** Stack of database disks — workspace / data storage. */
export function WorkspaceIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("ws-shadow")}
        <linearGradient id="ws-disk-1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e3eefa" />
          <stop offset="100%" stopColor={COLORS.blue} />
        </linearGradient>
        <linearGradient id="ws-disk-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe5fb" />
          <stop offset="100%" stopColor={COLORS.lavender} />
        </linearGradient>
      </defs>
      {/* Floor shadow */}
      <ellipse cx="100" cy="160" rx="56" ry="6" fill="#000" opacity="0.1" />
      {/* Bottom disk */}
      <g filter="url(#ws-shadow)">
        <ellipse cx="100" cy="148" rx="50" ry="12" fill={COLORS.blueDeep} opacity="0.6" />
        <ellipse cx="100" cy="144" rx="50" ry="12" fill="url(#ws-disk-1)" />
      </g>
      {/* Middle-bottom */}
      <g filter="url(#ws-shadow)">
        <ellipse cx="100" cy="124" rx="50" ry="12" fill={COLORS.lavenderDeep} opacity="0.6" />
        <ellipse cx="100" cy="120" rx="50" ry="12" fill="url(#ws-disk-2)" />
      </g>
      {/* Middle-top */}
      <g filter="url(#ws-shadow)">
        <ellipse cx="100" cy="100" rx="50" ry="12" fill={COLORS.blueDeep} opacity="0.6" />
        <ellipse cx="100" cy="96" rx="50" ry="12" fill="url(#ws-disk-1)" />
      </g>
      {/* Top disk */}
      <g filter="url(#ws-shadow)">
        <ellipse cx="100" cy="76" rx="50" ry="12" fill={COLORS.lavenderDeep} opacity="0.6" />
        <ellipse cx="100" cy="72" rx="50" ry="12" fill="url(#ws-disk-2)" />
      </g>
      {/* Highlight on top */}
      <ellipse cx="84" cy="68" rx="20" ry="2" fill="#fff" opacity="0.55" />
      {/* Activity dot */}
      <circle cx="134" cy="70" r="5" fill={COLORS.coralDeep} />
      <circle cx="134" cy="70" r="5" fill={COLORS.coralDeep} opacity="0.3" />
    </svg>
  );
}

/** Envelope with a peeking letter — inbox / messages. */
export function InboxIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("inbox-shadow")}
        <linearGradient id="inbox-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe1da" />
          <stop offset="100%" stopColor={COLORS.beige} />
        </linearGradient>
        <linearGradient id="inbox-flap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5dcd6" />
          <stop offset="100%" stopColor={COLORS.coralDeep} />
        </linearGradient>
      </defs>
      {/* Floor shadow */}
      <ellipse cx="100" cy="160" rx="64" ry="6" fill="#000" opacity="0.1" />
      {/* Envelope back */}
      <g filter="url(#inbox-shadow)">
        <rect x="36" y="74" width="128" height="78" rx="6" fill="url(#inbox-body)" />
      </g>
      {/* Letter peeking out */}
      <rect x="56" y="58" width="88" height="58" rx="4" fill="#ffffff" />
      <rect x="56" y="58" width="88" height="58" rx="4" fill="none" stroke={COLORS.inkSoft} strokeWidth="0.5" opacity="0.25" />
      <rect x="68" y="78" width="60" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.35" />
      <rect x="68" y="88" width="46" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.28" />
      <rect x="68" y="98" width="52" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.28" />
      {/* Envelope flap */}
      <g filter="url(#inbox-shadow)">
        <path d="M 36 74 L 100 116 L 164 74 Z" fill="url(#inbox-flap)" />
      </g>
      {/* Notification dot */}
      <circle cx="160" cy="80" r="9" fill="#fff" />
      <circle cx="160" cy="80" r="7" fill={COLORS.coralDeep} />
    </svg>
  );
}

// ─── Company dashboard ─────────────────────────────────────────────

/** A scroll/sheet with a quill resting beside it. */
export function PostTaskIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("post-shadow")}
        <linearGradient id="post-sheet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fce6e2" />
          <stop offset="100%" stopColor={COLORS.peach} />
        </linearGradient>
        <linearGradient id="post-quill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe5fb" />
          <stop offset="100%" stopColor={COLORS.lavenderDeep} />
        </linearGradient>
      </defs>
      {/* Floor shadow */}
      <ellipse cx="100" cy="172" rx="50" ry="5" fill="#000" opacity="0.1" />
      {/* Sheet */}
      <g filter="url(#post-shadow)">
        <rect x="50" y="48" width="100" height="116" rx="3" fill="url(#post-sheet)" />
      </g>
      {/* Glow at top of sheet */}
      <rect x="50" y="48" width="100" height="14" rx="3" fill={COLORS.coralDeep} opacity="0.55" />
      {/* Lines */}
      <rect x="62" y="78" width="60" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.35" />
      <rect x="62" y="92" width="76" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.25" />
      <rect x="62" y="106" width="48" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.25" />
      <rect x="62" y="120" width="64" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.22" />
      <rect x="62" y="134" width="40" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.22" />
      {/* Quill */}
      <g transform="rotate(35 154 116)" filter="url(#post-shadow)">
        <path d="M 130 110 L 174 100 L 178 110 L 134 122 Z" fill="url(#post-quill)" />
        <rect x="174" y="100" width="6" height="10" fill={COLORS.coralDeep} />
        <path d="M 178 110 L 188 116 L 178 120 Z" fill={COLORS.ink} />
      </g>
    </svg>
  );
}

/** Stack of cards/papers with a check on top — submissions. */
export function SubmissionsStackIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("subs-shadow")}
        <linearGradient id="subs-card-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dadfeb" />
          <stop offset="100%" stopColor={COLORS.blue} />
        </linearGradient>
        <linearGradient id="subs-card-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe1da" />
          <stop offset="100%" stopColor={COLORS.beige} />
        </linearGradient>
        <linearGradient id="subs-card-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dde6dd" />
          <stop offset="100%" stopColor={COLORS.sage} />
        </linearGradient>
      </defs>
      {/* Floor shadow */}
      <ellipse cx="100" cy="170" rx="56" ry="5" fill="#000" opacity="0.1" />
      {/* Back card */}
      <g transform="rotate(-7 100 110)" filter="url(#subs-shadow)">
        <rect x="48" y="58" width="100" height="100" rx="6" fill="url(#subs-card-back)" />
      </g>
      {/* Middle card */}
      <g transform="rotate(3 100 110)" filter="url(#subs-shadow)">
        <rect x="50" y="60" width="100" height="100" rx="6" fill="url(#subs-card-mid)" />
      </g>
      {/* Front card */}
      <g filter="url(#subs-shadow)">
        <rect x="56" y="56" width="100" height="100" rx="6" fill="url(#subs-card-front)" />
      </g>
      {/* Check circle */}
      <circle cx="106" cy="106" r="22" fill="#fff" />
      <circle cx="106" cy="106" r="22" fill="none" stroke={COLORS.sageDeep} strokeWidth="2" />
      <path
        d="M 96 108 L 104 116 L 118 100"
        fill="none"
        stroke={COLORS.sageDeep}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Two abstract shapes meeting in a handshake. */
export function DealsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("deals-shadow")}
        <linearGradient id="deals-left" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5dcd6" />
          <stop offset="100%" stopColor={COLORS.coralDeep} />
        </linearGradient>
        <linearGradient id="deals-right" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dadfeb" />
          <stop offset="100%" stopColor={COLORS.blueDeep} />
        </linearGradient>
        <radialGradient id="deals-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="55%" stopColor={COLORS.lavender} />
          <stop offset="100%" stopColor={COLORS.lavenderDeep} />
        </radialGradient>
      </defs>
      {/* Floor shadow */}
      <ellipse cx="100" cy="160" rx="74" ry="6" fill="#000" opacity="0.1" />
      {/* Left arm */}
      <g filter="url(#deals-shadow)">
        <path
          d="M 22 110 Q 36 70 76 80 Q 92 86 96 104 L 96 122 Q 84 130 60 128 Q 32 124 22 110 Z"
          fill="url(#deals-left)"
        />
      </g>
      {/* Right arm */}
      <g filter="url(#deals-shadow)">
        <path
          d="M 178 110 Q 164 70 124 80 Q 108 86 104 104 L 104 122 Q 116 130 140 128 Q 168 124 178 110 Z"
          fill="url(#deals-right)"
        />
      </g>
      {/* Meeting glow */}
      <g filter="url(#deals-shadow)">
        <circle cx="100" cy="112" r="20" fill="url(#deals-glow)" />
      </g>
      {/* Sparkles */}
      <circle cx="100" cy="50" r="2.5" fill={COLORS.lavenderDeep} />
      <circle cx="58" cy="56" r="1.8" fill={COLORS.lavenderDeep} />
      <circle cx="142" cy="56" r="1.8" fill={COLORS.lavenderDeep} />
    </svg>
  );
}

/** A 3-tiered podium with a sparkle above the center. */
export function LeaderboardIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("lb-shadow")}
        <linearGradient id="lb-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde8e2" />
          <stop offset="100%" stopColor={COLORS.coralDeep} />
        </linearGradient>
        <linearGradient id="lb-silver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe1da" />
          <stop offset="100%" stopColor={COLORS.beige} />
        </linearGradient>
        <linearGradient id="lb-bronze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dde6dd" />
          <stop offset="100%" stopColor={COLORS.sage} />
        </linearGradient>
      </defs>
      {/* Floor shadow */}
      <ellipse cx="100" cy="172" rx="64" ry="5" fill="#000" opacity="0.12" />
      {/* Sparkle */}
      <path
        d="M 100 22 L 103 38 L 119 41 L 103 44 L 100 60 L 97 44 L 81 41 L 97 38 Z"
        fill={COLORS.lavenderDeep}
      />
      {/* 2nd place (left, medium) */}
      <g filter="url(#lb-shadow)">
        <rect x="34" y="98" width="42" height="68" rx="3" fill="url(#lb-silver)" />
      </g>
      {/* 1st place (center, tallest) */}
      <g filter="url(#lb-shadow)">
        <rect x="79" y="74" width="42" height="92" rx="3" fill="url(#lb-gold)" />
      </g>
      {/* 3rd place (right, shortest) */}
      <g filter="url(#lb-shadow)">
        <rect x="124" y="118" width="42" height="48" rx="3" fill="url(#lb-bronze)" />
      </g>
      {/* Top highlights */}
      <rect x="34" y="98" width="42" height="3" fill="#fff" opacity="0.5" />
      <rect x="79" y="74" width="42" height="3" fill="#fff" opacity="0.55" />
      <rect x="124" y="118" width="42" height="3" fill="#fff" opacity="0.5" />
    </svg>
  );
}

/** Stacked clipboards — all tasks. */
export function AllTasksIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("at-shadow")}
        <linearGradient id="at-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe5fb" />
          <stop offset="100%" stopColor={COLORS.lavender} />
        </linearGradient>
        <linearGradient id="at-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe1da" />
          <stop offset="100%" stopColor={COLORS.beige} />
        </linearGradient>
      </defs>
      {/* Floor shadow */}
      <ellipse cx="100" cy="170" rx="50" ry="5" fill="#000" opacity="0.1" />
      {/* Back clipboard */}
      <g transform="rotate(-5 100 100)" filter="url(#at-shadow)">
        <rect x="50" y="46" width="92" height="108" rx="6" fill="url(#at-back)" />
      </g>
      {/* Front clipboard */}
      <g filter="url(#at-shadow)">
        <rect x="56" y="50" width="92" height="108" rx="6" fill="url(#at-front)" />
      </g>
      {/* Clip */}
      <rect x="86" y="42" width="32" height="14" rx="3" fill={COLORS.inkSoft} opacity="0.55" />
      <rect x="92" y="38" width="20" height="6" rx="2" fill={COLORS.inkSoft} opacity="0.7" />
      {/* Lines */}
      <rect x="68" y="76" width="56" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.35" />
      <rect x="68" y="90" width="48" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.28" />
      <rect x="68" y="104" width="64" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.28" />
      <rect x="68" y="118" width="40" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.28" />
      <rect x="68" y="132" width="52" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.25" />
      {/* Check circle */}
      <circle cx="138" cy="80" r="7" fill={COLORS.sageDeep} />
      <path
        d="M 134 80 L 137 83 L 142 77"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Sheet with a pencil mid-edit — drafts. */
export function DraftsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        {softShadowFilter("drafts-shadow")}
        <linearGradient id="drafts-sheet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbe6e0" />
          <stop offset="100%" stopColor={COLORS.peach} />
        </linearGradient>
        <linearGradient id="drafts-pencil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe5fb" />
          <stop offset="100%" stopColor={COLORS.lavenderDeep} />
        </linearGradient>
      </defs>
      {/* Floor shadow */}
      <ellipse cx="100" cy="172" rx="50" ry="5" fill="#000" opacity="0.1" />
      {/* Sheet */}
      <g filter="url(#drafts-shadow)">
        <rect x="48" y="48" width="96" height="118" rx="4" fill="url(#drafts-sheet)" />
      </g>
      {/* Lines */}
      <rect x="60" y="74" width="56" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.35" />
      <rect x="60" y="88" width="68" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.3" />
      <rect x="60" y="102" width="48" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.3" />
      <rect x="60" y="116" width="60" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.3" />
      {/* Pencil */}
      <g transform="rotate(35 138 130)" filter="url(#drafts-shadow)">
        <rect x="106" y="124" width="56" height="10" rx="2" fill="url(#drafts-pencil)" />
        <rect x="106" y="124" width="8" height="10" fill={COLORS.coralDeep} />
        <path d="M 162 124 L 172 129 L 162 134 Z" fill={COLORS.ink} />
      </g>
      {/* Status dot top-right */}
      <circle cx="58" cy="58" r="3.5" fill={COLORS.coralDeep} />
    </svg>
  );
}

/**
 * Map illustration components by id.
 */
export const ILLUSTRATIONS = {
  arena: ArenaIllustration,
  submission: SubmissionIllustration,
  reputation: ReputationIllustration,
  earnings: EarningsIllustration,
  workspace: WorkspaceIllustration,
  inbox: InboxIllustration,
  "post-task": PostTaskIllustration,
  "submissions-stack": SubmissionsStackIllustration,
  deals: DealsIllustration,
  leaderboard: LeaderboardIllustration,
  "all-tasks": AllTasksIllustration,
  drafts: DraftsIllustration,
} as const;

export type IllustrationId = keyof typeof ILLUSTRATIONS;
