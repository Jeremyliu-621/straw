// Tool-card illustrations — twelve inline SVGs in the ElevenLabs
// "sticker" style. Each one is built from two or three BIG chunky
// shapes: a main body, a saturated colored circle badge with a white
// icon glyph overlapping it, and (sometimes) a secondary accent —
// a pill, a second badge, a sparkle. Minimal internal detail. Each
// element is rotated slightly. Single soft drop shadow per shape.

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
  // Dusty saturated badge colors — still chill, still readable
  coralBadge: "#d6857d",
  blueBadge: "#8896c4",
  sageBadge: "#8db89c",
  peachBadge: "#dba38b",
  lavenderBadge: "#9c92c8",
  white: "#ffffff",
  cardLine: "#e5e7eb",
  ink: "#2a1f12",
};

function svgProps(className?: string): React.SVGProps<SVGSVGElement> {
  return {
    viewBox: "0 0 200 200",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    "aria-hidden": true,
  };
}

function shadowFilter(id: string) {
  return (
    <filter id={id} x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
      <feOffset dy="3" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.16" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

// ─── Agent dashboard ────────────────────────────────────────────────

/** Compete → big tilted task card + coral swords badge + small "vs" pill. */
export function ArenaIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("arena-s")}</defs>
      {/* Big task card */}
      <g transform="rotate(-7 100 100)" filter="url(#arena-s)">
        <rect x="46" y="44" width="108" height="124" rx="10" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* One chunky title bar */}
        <rect x="60" y="68" width="80" height="14" rx="4" fill={COLORS.coral} />
      </g>
      {/* Pill — small "vs" indicator */}
      <g transform="rotate(8 130 60)" filter="url(#arena-s)">
        <rect x="108" y="50" width="44" height="20" rx="10" fill={COLORS.lavender} />
      </g>
      {/* Big coral badge — crossed swords */}
      <g filter="url(#arena-s)">
        <circle cx="58" cy="146" r="28" fill={COLORS.coralBadge} />
        <line x1="44" y1="132" x2="72" y2="160" stroke={COLORS.white} strokeWidth="4" strokeLinecap="round" />
        <line x1="72" y1="132" x2="44" y2="160" stroke={COLORS.white} strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** In flight → big task card + peach paper-plane badge + curved motion swoosh. */
export function SubmissionIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("sub-s")}</defs>
      {/* Motion swoosh */}
      <path
        d="M 28 168 Q 80 130 130 138"
        fill="none"
        stroke={COLORS.peach}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.8"
      />
      {/* Big card */}
      <g transform="rotate(-9 100 100)" filter="url(#sub-s)">
        <rect x="46" y="40" width="108" height="124" rx="10" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="62" y="68" width="76" height="12" rx="4" fill={COLORS.peach} />
      </g>
      {/* Big peach badge — paper plane */}
      <g filter="url(#sub-s)">
        <circle cx="146" cy="148" r="28" fill={COLORS.peachBadge} />
        <path
          d="M 132 150 L 162 134 L 156 162 L 148 154 L 142 158 Z"
          fill={COLORS.white}
        />
      </g>
    </svg>
  );
}

/** Reputation → big card with one star row + lavender star badge. */
export function ReputationIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("rep-s")}</defs>
      {/* Big card */}
      <g transform="rotate(-6 100 100)" filter="url(#rep-s)">
        <rect x="46" y="44" width="108" height="124" rx="10" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* Three big chunky stars */}
        {[0, 1, 2].map((i) => {
          const cx = 70 + i * 30;
          return (
            <path
              key={i}
              d={`M ${cx} 86 L ${cx + 5} 100 L ${cx + 19} 102 L ${cx + 9} 112 L ${cx + 12} 126 L ${cx} 119 L ${cx - 12} 126 L ${cx - 9} 112 L ${cx - 19} 102 L ${cx - 5} 100 Z`}
              fill={COLORS.coral}
            />
          );
        })}
      </g>
      {/* Big lavender badge — single star */}
      <g filter="url(#rep-s)">
        <circle cx="148" cy="56" r="28" fill={COLORS.lavenderBadge} />
        <path
          d="M 148 38 L 153 52 L 167 53 L 156 62 L 161 75 L 148 67 L 135 75 L 140 62 L 129 53 L 143 52 Z"
          fill={COLORS.white}
        />
      </g>
    </svg>
  );
}

/** Earnings → big card with chunky chart + coral $ badge. */
export function EarningsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("earn-s")}</defs>
      {/* Big card */}
      <g transform="rotate(-7 100 100)" filter="url(#earn-s)">
        <rect x="46" y="40" width="108" height="120" rx="10" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* Filled-area chart underneath */}
        <path
          d="M 60 134 L 60 110 L 80 92 L 102 102 L 120 78 L 142 88 L 142 134 Z"
          fill={COLORS.peach}
          opacity="0.7"
        />
        {/* Chart line on top */}
        <polyline
          points="60,110 80,92 102,102 120,78 142,88"
          fill="none"
          stroke={COLORS.coralBadge}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
      {/* Big coral badge — $ */}
      <g filter="url(#earn-s)">
        <circle cx="148" cy="148" r="28" fill={COLORS.coralBadge} />
        <text
          x="148"
          y="159"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="30"
          fontWeight="700"
          textAnchor="middle"
          fill={COLORS.white}
        >
          $
        </text>
      </g>
    </svg>
  );
}

/** Workspace → big stacked folders + blue folder badge. */
export function WorkspaceIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("ws-s")}</defs>
      {/* Back folder (lavender) */}
      <g transform="rotate(8 110 100)" filter="url(#ws-s)">
        <path
          d="M 60 60 L 86 60 L 96 70 L 156 70 L 156 154 L 60 154 Z"
          fill={COLORS.lavender}
        />
      </g>
      {/* Front folder (beige, larger) */}
      <g transform="rotate(-6 90 100)" filter="url(#ws-s)">
        <path
          d="M 44 50 L 70 50 L 80 60 L 152 60 L 152 158 L 44 158 Z"
          fill={COLORS.beige}
        />
        <rect x="44" y="50" width="108" height="6" rx="2" fill={COLORS.peach} opacity="0.6" />
      </g>
      {/* Big blue badge — folder glyph */}
      <g filter="url(#ws-s)">
        <circle cx="150" cy="148" r="28" fill={COLORS.blueBadge} />
        <path
          d="M 134 138 L 142 138 L 146 142 L 166 142 L 166 160 L 134 160 Z"
          fill={COLORS.white}
        />
      </g>
    </svg>
  );
}

/** Inbox → big envelope + coral bell badge. */
export function InboxIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("inbox-s")}</defs>
      {/* Envelope — bigger, simpler */}
      <g transform="rotate(-6 100 102)" filter="url(#inbox-s)">
        <rect x="32" y="56" width="136" height="92" rx="8" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* Triangular flap */}
        <path d="M 32 56 L 100 110 L 168 56 Z" fill={COLORS.beige} />
        {/* Side fold lines */}
        <line x1="32" y1="148" x2="86" y2="100" stroke={COLORS.cardLine} strokeWidth="1.5" />
        <line x1="168" y1="148" x2="114" y2="100" stroke={COLORS.cardLine} strokeWidth="1.5" />
      </g>
      {/* Big coral badge — bell */}
      <g filter="url(#inbox-s)">
        <circle cx="150" cy="56" r="28" fill={COLORS.coralBadge} />
        <path
          d="M 150 40 C 142 40 138 46 138 56 L 134 66 L 166 66 L 162 56 C 162 46 158 40 150 40 Z"
          fill={COLORS.white}
        />
        <circle cx="150" cy="70" r="3.5" fill={COLORS.white} />
      </g>
    </svg>
  );
}

// ─── Company dashboard ─────────────────────────────────────────────

/** Post a task → big sheet + coral plus badge. */
export function PostTaskIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("post-s")}</defs>
      {/* Big sheet */}
      <g transform="rotate(-7 100 100)" filter="url(#post-s)">
        <rect x="44" y="36" width="112" height="132" rx="8" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* Header bar */}
        <rect x="60" y="60" width="76" height="14" rx="4" fill={COLORS.peach} />
        {/* Body lines (only 2 for chunkier feel) */}
        <rect x="60" y="92" width="84" height="6" rx="3" fill={COLORS.cardLine} />
        <rect x="60" y="108" width="60" height="6" rx="3" fill={COLORS.cardLine} />
      </g>
      {/* Big coral badge — plus */}
      <g filter="url(#post-s)">
        <circle cx="150" cy="148" r="28" fill={COLORS.coralBadge} />
        <line x1="150" y1="134" x2="150" y2="162" stroke={COLORS.white} strokeWidth="4.5" strokeLinecap="round" />
        <line x1="136" y1="148" x2="164" y2="148" stroke={COLORS.white} strokeWidth="4.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Submissions → fanned card stack + sage check badge. */
export function SubmissionsStackIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("subs-s")}</defs>
      {/* Back card */}
      <g transform="rotate(-14 100 110)" filter="url(#subs-s)">
        <rect x="42" y="56" width="100" height="116" rx="10" fill={COLORS.blue} />
      </g>
      {/* Middle card */}
      <g transform="rotate(5 100 110)" filter="url(#subs-s)">
        <rect x="48" y="50" width="100" height="116" rx="10" fill={COLORS.beige} />
      </g>
      {/* Front card */}
      <g transform="rotate(-3 100 100)" filter="url(#subs-s)">
        <rect x="50" y="44" width="98" height="116" rx="10" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* One chunky title bar */}
        <rect x="64" y="68" width="60" height="10" rx="4" fill={COLORS.sage} />
      </g>
      {/* Big sage badge — check */}
      <g filter="url(#subs-s)">
        <circle cx="150" cy="148" r="28" fill={COLORS.sageBadge} />
        <path
          d="M 138 148 L 147 157 L 162 140"
          fill="none"
          stroke={COLORS.white}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** Deals → two cards meeting + big lavender handshake badge. */
export function DealsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("deals-s")}</defs>
      {/* Left card */}
      <g transform="rotate(-15 65 100)" filter="url(#deals-s)">
        <rect x="22" y="44" width="86" height="116" rx="10" fill={COLORS.coral} />
      </g>
      {/* Right card */}
      <g transform="rotate(15 135 100)" filter="url(#deals-s)">
        <rect x="92" y="44" width="86" height="116" rx="10" fill={COLORS.blue} />
      </g>
      {/* Big lavender badge — handshake glyph */}
      <g filter="url(#deals-s)">
        <circle cx="100" cy="100" r="32" fill={COLORS.lavenderBadge} />
        <path
          d="M 84 96 L 100 110 L 116 96"
          fill="none"
          stroke={COLORS.white}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="84" y1="108" x2="116" y2="108" stroke={COLORS.white} strokeWidth="4.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Leaderboard → 3-tier podium + coral "1" badge. */
export function LeaderboardIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("lb-s")}</defs>
      {/* 2nd place (left, medium) */}
      <g filter="url(#lb-s)">
        <rect x="26" y="92" width="50" height="80" rx="6" fill={COLORS.beige} />
      </g>
      {/* 3rd place (right, shortest) */}
      <g filter="url(#lb-s)">
        <rect x="124" y="120" width="50" height="52" rx="6" fill={COLORS.sage} />
      </g>
      {/* 1st place (center, tallest) */}
      <g filter="url(#lb-s)">
        <rect x="75" y="64" width="50" height="108" rx="6" fill={COLORS.peach} />
      </g>
      {/* Big coral badge with "1" — sits on top of 1st place */}
      <g filter="url(#lb-s)">
        <circle cx="100" cy="48" r="26" fill={COLORS.coralBadge} />
        <text
          x="100"
          y="59"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="28"
          fontWeight="700"
          textAnchor="middle"
          fill={COLORS.white}
        >
          1
        </text>
      </g>
    </svg>
  );
}

/** All tasks → big clipboard + sage check badge. */
export function AllTasksIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("at-s")}</defs>
      {/* Back card */}
      <g transform="rotate(8 110 100)" filter="url(#at-s)">
        <rect x="58" y="50" width="92" height="116" rx="8" fill={COLORS.lavender} />
      </g>
      {/* Front clipboard */}
      <g transform="rotate(-5 90 100)" filter="url(#at-s)">
        <rect x="44" y="44" width="100" height="124" rx="8" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* Clip */}
        <rect x="78" y="36" width="32" height="16" rx="4" fill={COLORS.beige} />
        {/* Three big checked rows */}
        {[0, 1, 2].map((i) => {
          const y = 76 + i * 24;
          const checked = i < 2;
          return (
            <g key={i}>
              <rect
                x="56"
                y={y}
                width="14"
                height="14"
                rx="3"
                fill={checked ? COLORS.sageBadge : COLORS.white}
                stroke={checked ? COLORS.sageBadge : COLORS.cardLine}
                strokeWidth="1.5"
              />
              {checked && (
                <path
                  d={`M ${59} ${y + 7} L ${62} ${y + 10} L ${68} ${y + 4}`}
                  fill="none"
                  stroke={COLORS.white}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <rect
                x="78"
                y={y + 4}
                width={i === 0 ? 50 : i === 1 ? 38 : 56}
                height="6"
                rx="3"
                fill={checked ? COLORS.cardLine : COLORS.coral}
                opacity={checked ? 0.7 : 1}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** Drafts → big sheet + lavender pencil badge. */
export function DraftsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("drafts-s")}</defs>
      {/* Big sheet */}
      <g transform="rotate(-7 100 100)" filter="url(#drafts-s)">
        <rect x="44" y="36" width="112" height="132" rx="8" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="60" y="60" width="76" height="14" rx="4" fill={COLORS.peach} />
        {/* Two chunky body lines */}
        <rect x="60" y="92" width="80" height="6" rx="3" fill={COLORS.cardLine} />
        <rect x="60" y="108" width="64" height="6" rx="3" fill={COLORS.cardLine} />
      </g>
      {/* Big lavender badge — pencil */}
      <g filter="url(#drafts-s)">
        <circle cx="150" cy="148" r="28" fill={COLORS.lavenderBadge} />
        <g transform="rotate(45 150 148)">
          <rect x="138" y="138" width="20" height="8" rx="2" fill={COLORS.white} />
          <rect x="138" y="146" width="20" height="8" rx="2" fill={COLORS.white} opacity="0.85" />
          <path d="M 158 138 L 166 142 L 158 146 Z" fill={COLORS.white} />
        </g>
      </g>
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
