// Tool-card illustrations — eight inline SVGs for the home dashboard.
//
// We had a generation script for AI raster art (scripts/generate-
// illustrations.mjs) but the OpenAI billing limit stopped the run.
// These are the fallback: same subjects, hand-drawn SVG, same pastel
// palette. They're cheap, theme-agnostic (no fills tied to var(--bg)
// — they sit on the tool-card tint), and deterministic.
//
// Each component accepts a className so the consumer can size it.
// They render at viewBox="0 0 200 200" — square, centered subjects.

import * as React from "react";

interface IllustrationProps {
  className?: string;
}

const COLORS = {
  coral: "#ecd0cc",
  blue: "#cfd5e8",
  sage: "#d0d7d1",
  beige: "#e0d6d0",
  peach: "#f7d4d0",
  lavender: "#d9d4f6",
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

// ─── Agent dashboard ────────────────────────────────────────────────

/** Concentric arena rings with a tiny silhouette in the center. */
export function ArenaIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <ellipse cx="100" cy="115" rx="78" ry="22" fill={COLORS.coral} opacity="0.55" />
      <ellipse cx="100" cy="110" rx="62" ry="17" fill={COLORS.peach} opacity="0.85" />
      <ellipse cx="100" cy="105" rx="46" ry="12" fill={COLORS.sage} opacity="0.85" />
      <ellipse cx="100" cy="102" rx="30" ry="8" fill={COLORS.blue} opacity="0.85" />
      {/* Lone competitor */}
      <ellipse cx="100" cy="98" rx="3.5" ry="2" fill={COLORS.ink} />
      <rect x="98" y="82" width="4" height="14" rx="2" fill={COLORS.ink} />
      <circle cx="100" cy="80" r="4.5" fill={COLORS.ink} />
    </svg>
  );
}

/** A wrapped parcel mid-flight with a ribbon and a soft motion swoosh. */
export function SubmissionIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      {/* motion swoosh */}
      <path
        d="M 22 138 Q 70 132 100 142"
        fill="none"
        stroke={COLORS.coral}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M 30 152 Q 65 148 90 156"
        fill="none"
        stroke={COLORS.peach}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* parcel */}
      <rect x="60" y="58" width="80" height="70" rx="6" fill={COLORS.beige} />
      <rect x="60" y="58" width="80" height="70" rx="6" fill="none" stroke={COLORS.inkSoft} strokeWidth="1.5" opacity="0.4" />
      {/* ribbon vertical */}
      <rect x="94" y="58" width="12" height="70" fill={COLORS.coral} />
      {/* ribbon horizontal */}
      <rect x="60" y="86" width="80" height="12" fill={COLORS.coral} />
      {/* knot */}
      <circle cx="100" cy="92" r="9" fill={COLORS.coral} />
      <circle cx="100" cy="92" r="9" fill="none" stroke={COLORS.inkSoft} strokeWidth="1" opacity="0.5" />
      {/* glow */}
      <circle cx="148" cy="50" r="3" fill={COLORS.peach} />
      <circle cx="156" cy="62" r="2" fill={COLORS.peach} />
    </svg>
  );
}

/** A laurel/medal shape with a ribbon and a few sparkles. */
export function ReputationIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      {/* left laurel */}
      <path
        d="M 58 100 Q 50 80 60 60 Q 70 76 76 100 Z"
        fill={COLORS.sage}
      />
      <path
        d="M 50 120 Q 44 100 56 84 Q 62 100 68 120 Z"
        fill={COLORS.sage}
        opacity="0.85"
      />
      {/* right laurel */}
      <path
        d="M 142 100 Q 150 80 140 60 Q 130 76 124 100 Z"
        fill={COLORS.sage}
      />
      <path
        d="M 150 120 Q 156 100 144 84 Q 138 100 132 120 Z"
        fill={COLORS.sage}
        opacity="0.85"
      />
      {/* medal */}
      <circle cx="100" cy="110" r="22" fill={COLORS.peach} />
      <circle cx="100" cy="110" r="22" fill="none" stroke={COLORS.coral} strokeWidth="3" />
      <circle cx="100" cy="110" r="10" fill={COLORS.coral} />
      {/* ribbon */}
      <path d="M 88 130 L 82 152 L 100 144 L 118 152 L 112 130 Z" fill={COLORS.coral} />
      {/* sparkles */}
      <circle cx="48" cy="50" r="2" fill={COLORS.peach} />
      <circle cx="158" cy="48" r="2.5" fill={COLORS.peach} />
      <circle cx="170" cy="80" r="1.5" fill={COLORS.coral} />
    </svg>
  );
}

/** A small stack of pastel coins with a sparkle. */
export function EarningsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      {/* shadow base */}
      <ellipse cx="100" cy="155" rx="48" ry="6" fill={COLORS.inkSoft} opacity="0.12" />
      {/* coin 1 (bottom) */}
      <ellipse cx="100" cy="142" rx="44" ry="11" fill={COLORS.beige} />
      <ellipse cx="100" cy="138" rx="44" ry="11" fill={COLORS.peach} />
      <ellipse cx="100" cy="138" rx="44" ry="11" fill="none" stroke={COLORS.coral} strokeWidth="1.5" opacity="0.7" />
      {/* coin 2 */}
      <ellipse cx="100" cy="118" rx="40" ry="10" fill={COLORS.coral} />
      <ellipse cx="100" cy="114" rx="40" ry="10" fill={COLORS.peach} />
      <ellipse cx="100" cy="114" rx="40" ry="10" fill="none" stroke={COLORS.coral} strokeWidth="1.5" opacity="0.7" />
      {/* coin 3 (top) */}
      <ellipse cx="100" cy="92" rx="36" ry="9" fill={COLORS.coral} />
      <ellipse cx="100" cy="88" rx="36" ry="9" fill={COLORS.peach} />
      <ellipse cx="100" cy="88" rx="36" ry="9" fill="none" stroke={COLORS.coral} strokeWidth="1.5" opacity="0.7" />
      {/* sparkle */}
      <path
        d="M 140 50 L 142 60 L 152 62 L 142 64 L 140 74 L 138 64 L 128 62 L 138 60 Z"
        fill={COLORS.lavender}
      />
    </svg>
  );
}

// ─── Company dashboard ─────────────────────────────────────────────

/** A scroll/sheet with a quill resting beside it. */
export function PostTaskIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      {/* scroll bottom curl */}
      <path
        d="M 50 142 Q 60 152 70 142 L 70 154 Q 60 162 50 154 Z"
        fill={COLORS.beige}
      />
      <path d="M 50 142 Q 60 152 70 142" fill="none" stroke={COLORS.inkSoft} strokeWidth="1" opacity="0.4" />
      {/* sheet */}
      <rect x="50" y="50" width="100" height="92" rx="2" fill={COLORS.peach} />
      <rect x="50" y="50" width="100" height="92" fill="none" stroke={COLORS.inkSoft} strokeWidth="1" opacity="0.4" />
      {/* glow at top */}
      <rect x="50" y="50" width="100" height="14" fill={COLORS.coral} opacity="0.55" />
      {/* lines on sheet */}
      <rect x="62" y="78" width="60" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.35" />
      <rect x="62" y="92" width="76" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.25" />
      <rect x="62" y="106" width="50" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.25" />
      {/* quill */}
      <path
        d="M 152 122 L 168 70 Q 174 76 172 86 L 160 130 Z"
        fill={COLORS.lavender}
      />
      <path d="M 152 122 L 158 130" stroke={COLORS.ink} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** A small fanned stack of papers, top one shows a check shape. */
export function SubmissionsStackIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      {/* back card (rotated) */}
      <g transform="rotate(-7 100 110)">
        <rect x="50" y="60" width="100" height="100" rx="6" fill={COLORS.blue} />
      </g>
      {/* middle card */}
      <g transform="rotate(3 100 110)">
        <rect x="50" y="60" width="100" height="100" rx="6" fill={COLORS.beige} />
      </g>
      {/* front card */}
      <rect x="56" y="58" width="100" height="100" rx="6" fill={COLORS.sage} />
      <rect x="56" y="58" width="100" height="100" rx="6" fill="none" stroke={COLORS.inkSoft} strokeWidth="1" opacity="0.35" />
      {/* check shape (no text) */}
      <circle cx="106" cy="108" r="22" fill={COLORS.paper} />
      <path
        d="M 96 110 L 104 118 L 118 100"
        fill="none"
        stroke={COLORS.ink}
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
      {/* left shape */}
      <path
        d="M 30 110 Q 40 80 70 86 Q 86 90 92 104 L 90 118 Q 80 126 60 124 Q 38 122 30 110 Z"
        fill={COLORS.coral}
      />
      {/* right shape */}
      <path
        d="M 170 110 Q 160 80 130 86 Q 114 90 108 104 L 110 118 Q 120 126 140 124 Q 162 122 170 110 Z"
        fill={COLORS.blue}
      />
      {/* meeting point glow */}
      <circle cx="100" cy="111" r="16" fill={COLORS.lavender} />
      <circle cx="100" cy="111" r="16" fill="none" stroke={COLORS.ink} strokeWidth="1.5" opacity="0.4" />
      {/* sparkles */}
      <circle cx="100" cy="60" r="2" fill={COLORS.peach} />
      <circle cx="60" cy="58" r="1.5" fill={COLORS.lavender} />
      <circle cx="140" cy="58" r="1.5" fill={COLORS.lavender} />
    </svg>
  );
}

/** Three-tiered podium with a sparkle above the center. */
export function LeaderboardIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      {/* sparkle */}
      <path
        d="M 100 28 L 103 42 L 117 45 L 103 48 L 100 62 L 97 48 L 83 45 L 97 42 Z"
        fill={COLORS.lavender}
      />
      {/* podium 2nd (left, medium) */}
      <rect x="36" y="98" width="40" height="62" rx="3" fill={COLORS.beige} />
      <rect x="36" y="98" width="40" height="6" fill={COLORS.coral} opacity="0.6" />
      {/* podium 1st (center, tallest) */}
      <rect x="80" y="74" width="40" height="86" rx="3" fill={COLORS.coral} />
      <rect x="80" y="74" width="40" height="6" fill={COLORS.peach} opacity="0.85" />
      {/* podium 3rd (right, shortest) */}
      <rect x="124" y="116" width="40" height="44" rx="3" fill={COLORS.sage} />
      <rect x="124" y="116" width="40" height="6" fill={COLORS.blue} opacity="0.7" />
    </svg>
  );
}

// ─── Shared (both audiences) ───────────────────────────────────────

/** Stack of database disks — workspace / KV storage. */
export function WorkspaceIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      {/* base shadow */}
      <ellipse cx="100" cy="158" rx="52" ry="6" fill={COLORS.inkSoft} opacity="0.1" />
      {/* disks */}
      {[140, 116, 92, 68].map((y, idx) => (
        <g key={y}>
          <ellipse cx="100" cy={y + 4} rx="46" ry="11" fill={COLORS.blue} opacity="0.85" />
          <ellipse cx="100" cy={y} rx="46" ry="11" fill={idx === 0 ? COLORS.lavender : COLORS.beige} />
          <ellipse cx="100" cy={y} rx="46" ry="11" fill="none" stroke={COLORS.inkSoft} strokeWidth="1" opacity="0.35" />
        </g>
      ))}
      {/* tiny activity dot */}
      <circle cx="124" cy="68" r="3" fill={COLORS.coral} />
    </svg>
  );
}

/** Envelope with a peeking letter — inbox / messages. */
export function InboxIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      {/* envelope back */}
      <rect x="38" y="72" width="124" height="80" rx="6" fill={COLORS.beige} />
      {/* letter sticking out */}
      <rect x="56" y="58" width="88" height="60" rx="3" fill={COLORS.paper} />
      <rect x="68" y="76" width="58" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.3" />
      <rect x="68" y="86" width="44" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.25" />
      <rect x="68" y="96" width="50" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.25" />
      {/* envelope flap */}
      <path d="M 38 72 L 100 116 L 162 72 Z" fill={COLORS.coral} />
      <path d="M 38 72 L 100 116 L 162 72" fill="none" stroke={COLORS.inkSoft} strokeWidth="1" opacity="0.4" />
      {/* notification dot */}
      <circle cx="158" cy="78" r="6" fill="#e87a6f" />
    </svg>
  );
}

/** Stacked clipboards — all tasks. */
export function AllTasksIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      {/* back clipboard */}
      <g transform="rotate(-5 100 100)">
        <rect x="56" y="50" width="88" height="100" rx="6" fill={COLORS.lavender} opacity="0.7" />
      </g>
      {/* front clipboard */}
      <rect x="60" y="54" width="88" height="100" rx="6" fill={COLORS.beige} />
      <rect x="60" y="54" width="88" height="100" rx="6" fill="none" stroke={COLORS.inkSoft} strokeWidth="1" opacity="0.3" />
      {/* clip */}
      <rect x="86" y="46" width="36" height="14" rx="3" fill={COLORS.inkSoft} opacity="0.5" />
      {/* lines */}
      <rect x="72" y="78" width="58" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.3" />
      <rect x="72" y="92" width="48" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.25" />
      <rect x="72" y="106" width="62" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.25" />
      <rect x="72" y="120" width="40" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.25" />
      {/* check */}
      <circle cx="138" cy="80" r="5" fill={COLORS.sage} />
    </svg>
  );
}

/** Sheet with a pencil mid-edit — drafts. */
export function DraftsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      {/* sheet */}
      <rect x="52" y="50" width="92" height="110" rx="3" fill={COLORS.peach} />
      <rect x="52" y="50" width="92" height="110" fill="none" stroke={COLORS.inkSoft} strokeWidth="1" opacity="0.4" />
      {/* lines */}
      <rect x="64" y="76" width="56" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.35" />
      <rect x="64" y="90" width="68" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.3" />
      <rect x="64" y="104" width="48" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.3" />
      <rect x="64" y="118" width="60" height="3" rx="1.5" fill={COLORS.inkSoft} opacity="0.3" />
      {/* pencil at angle, just above paper */}
      <g transform="rotate(35 138 124)">
        <rect x="116" y="120" width="44" height="8" rx="1" fill={COLORS.lavender} />
        <rect x="116" y="120" width="6" height="8" fill={COLORS.coral} />
        <path d="M 160 120 L 168 124 L 160 128 Z" fill={COLORS.inkSoft} opacity="0.7" />
      </g>
      {/* draft dot */}
      <circle cx="62" cy="58" r="3" fill={COLORS.coral} />
    </svg>
  );
}

/**
 * Map illustration components by id — convenient for the home page
 * tool-card row to look up by name.
 */
export const ILLUSTRATIONS = {
  arena: ArenaIllustration,
  submission: SubmissionIllustration,
  reputation: ReputationIllustration,
  earnings: EarningsIllustration,
  "post-task": PostTaskIllustration,
  "submissions-stack": SubmissionsStackIllustration,
  deals: DealsIllustration,
  leaderboard: LeaderboardIllustration,
  workspace: WorkspaceIllustration,
  inbox: InboxIllustration,
  "all-tasks": AllTasksIllustration,
  drafts: DraftsIllustration,
} as const;

export type IllustrationId = keyof typeof ILLUSTRATIONS;
