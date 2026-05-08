// Tool-card illustrations — twelve inline SVGs in the ElevenLabs
// "sticker" style. Each is a small composition of flat-colored
// shapes (rotated slightly for energy), with one saturated-color
// circular badge overlapping the main element. White icon glyph
// inside the badge. Single soft drop shadow under each main shape.
//
// No gradients. No 3D. Childlike. The meaning comes from the badge —
// the body shape just gives it something to overlap.

import * as React from "react";

interface IllustrationProps {
  className?: string;
}

const COLORS = {
  // Pastels (used for line markings, card body washes)
  coral: "#ecd0cc",
  blue: "#cfd5e8",
  sage: "#d0d7d1",
  beige: "#e0d6d0",
  peach: "#f7d4d0",
  lavender: "#d9d4f6",
  // Badge colors — dusty middle ground between the pastel orbs and
  // a fully-saturated accent. Quiet enough to read as "chill", but
  // distinct enough to carry the icon's identity.
  coralBadge: "#d6857d",
  blueBadge: "#8896c4",
  sageBadge: "#8db89c",
  peachBadge: "#dba38b",
  lavenderBadge: "#9c92c8",
  amberBadge: "#c89a73",
  // Surface colors
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

/** Soft single drop shadow used on every main shape. */
function shadowFilter(id: string) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
      <feOffset dy="2" />
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

/** Compete → a task card tilted, with a coral "vs" badge. */
export function ArenaIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("arena-s")}</defs>
      {/* Back card (lavender wash, more tilted) */}
      <g transform="rotate(8 110 100)" filter="url(#arena-s)">
        <rect x="68" y="56" width="84" height="100" rx="8" fill={COLORS.lavender} />
      </g>
      {/* Front task card */}
      <g transform="rotate(-6 90 100)" filter="url(#arena-s)">
        <rect x="50" y="50" width="92" height="108" rx="8" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="62" y="74" width="42" height="6" rx="3" fill={COLORS.coral} />
        <rect x="62" y="90" width="58" height="4" rx="2" fill={COLORS.blue} opacity="0.6" />
        <rect x="62" y="102" width="40" height="4" rx="2" fill={COLORS.blue} opacity="0.6" />
      </g>
      {/* Coral badge — crossed swords */}
      <g filter="url(#arena-s)">
        <circle cx="62" cy="138" r="22" fill={COLORS.coralBadge} />
        {/* Two stylized crossed sword strokes */}
        <line x1="51" y1="127" x2="73" y2="149" stroke={COLORS.white} strokeWidth="3" strokeLinecap="round" />
        <line x1="73" y1="127" x2="51" y2="149" stroke={COLORS.white} strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** In flight → tilted task card with a peach paper-plane badge. */
export function SubmissionIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("sub-s")}</defs>
      {/* Card */}
      <g transform="rotate(-8 100 100)" filter="url(#sub-s)">
        <rect x="50" y="50" width="100" height="116" rx="8" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="62" y="72" width="48" height="6" rx="3" fill={COLORS.peach} />
        <rect x="62" y="88" width="64" height="4" rx="2" fill={COLORS.blue} opacity="0.55" />
        <rect x="62" y="100" width="50" height="4" rx="2" fill={COLORS.blue} opacity="0.55" />
        <rect x="62" y="112" width="36" height="4" rx="2" fill={COLORS.blue} opacity="0.55" />
      </g>
      {/* Peach badge — paper plane (simple triangular path) */}
      <g filter="url(#sub-s)">
        <circle cx="148" cy="142" r="22" fill={COLORS.peachBadge} />
        <path
          d="M 137 144 L 158 132 L 154 154 L 148 148 L 142 152 Z"
          fill={COLORS.white}
        />
      </g>
    </svg>
  );
}

/** Reputation → tilted card with a star badge. */
export function ReputationIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("rep-s")}</defs>
      {/* Card */}
      <g transform="rotate(-6 100 100)" filter="url(#rep-s)">
        <rect x="56" y="48" width="88" height="108" rx="8" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* Star rating row inside */}
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M ${66 + i * 13} 80 L ${68 + i * 13} 86 L ${75 + i * 13} 87 L ${69 + i * 13} 92 L ${71 + i * 13} 99 L ${66 + i * 13} 96 L ${61 + i * 13} 99 L ${63 + i * 13} 92 L ${57 + i * 13} 87 L ${64 + i * 13} 86 Z`}
            fill={COLORS.coral}
          />
        ))}
        <rect x="64" y="112" width="64" height="4" rx="2" fill={COLORS.blue} opacity="0.55" />
        <rect x="64" y="124" width="48" height="4" rx="2" fill={COLORS.blue} opacity="0.55" />
      </g>
      {/* Lavender badge — single big star */}
      <g filter="url(#rep-s)">
        <circle cx="148" cy="56" r="22" fill={COLORS.lavenderBadge} />
        <path
          d="M 148 42 L 152 52 L 162 53 L 154 60 L 157 70 L 148 64 L 139 70 L 142 60 L 134 53 L 144 52 Z"
          fill={COLORS.white}
        />
      </g>
    </svg>
  );
}

/** Earnings → tilted card with a chart line and a coral "$" badge. */
export function EarningsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("earn-s")}</defs>
      {/* Card */}
      <g transform="rotate(-7 100 100)" filter="url(#earn-s)">
        <rect x="50" y="48" width="100" height="112" rx="8" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* Big number bars */}
        <rect x="62" y="68" width="34" height="6" rx="3" fill={COLORS.peach} />
        {/* Chart polyline */}
        <polyline
          points="64,128 78,108 92,118 108,90 128,100 138,82"
          fill="none"
          stroke={COLORS.coralBadge}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Chart endpoint dot */}
        <circle cx="138" cy="82" r="3" fill={COLORS.coralBadge} />
        <rect x="62" y="142" width="44" height="4" rx="2" fill={COLORS.blue} opacity="0.55" />
      </g>
      {/* Coral badge — dollar sign */}
      <g filter="url(#earn-s)">
        <circle cx="152" cy="146" r="22" fill={COLORS.coralBadge} />
        <text
          x="152"
          y="155"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="22"
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

/** Workspace → tilted stack of cards + a blue folder badge. */
export function WorkspaceIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("ws-s")}</defs>
      {/* Back card */}
      <g transform="rotate(7 100 110)" filter="url(#ws-s)">
        <rect x="60" y="60" width="84" height="96" rx="8" fill={COLORS.beige} />
      </g>
      {/* Middle card */}
      <g transform="rotate(-3 100 105)" filter="url(#ws-s)">
        <rect x="56" y="58" width="88" height="100" rx="8" fill={COLORS.lavender} />
      </g>
      {/* Front card with file lines */}
      <g transform="rotate(-9 100 100)" filter="url(#ws-s)">
        <rect x="50" y="50" width="92" height="108" rx="8" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="62" y="72" width="56" height="4" rx="2" fill={COLORS.blue} opacity="0.55" />
        <rect x="62" y="84" width="40" height="4" rx="2" fill={COLORS.blue} opacity="0.55" />
        <rect x="62" y="100" width="60" height="4" rx="2" fill={COLORS.blue} opacity="0.4" />
        <rect x="62" y="112" width="46" height="4" rx="2" fill={COLORS.blue} opacity="0.4" />
      </g>
      {/* Blue badge — folder icon */}
      <g filter="url(#ws-s)">
        <circle cx="150" cy="146" r="22" fill={COLORS.blueBadge} />
        {/* Simple folder shape */}
        <path
          d="M 138 138 L 144 138 L 148 142 L 162 142 L 162 156 L 138 156 Z"
          fill={COLORS.white}
        />
      </g>
    </svg>
  );
}

/** Inbox → envelope tilted, with a coral notification dot badge. */
export function InboxIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("inbox-s")}</defs>
      {/* Envelope body */}
      <g transform="rotate(-5 100 102)" filter="url(#inbox-s)">
        <rect x="40" y="68" width="120" height="80" rx="6" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* Triangular flap (filled) */}
        <path d="M 40 68 L 100 116 L 160 68 Z" fill={COLORS.beige} />
        {/* Side fold lines */}
        <line x1="40" y1="148" x2="86" y2="108" stroke={COLORS.cardLine} strokeWidth="1" />
        <line x1="160" y1="148" x2="114" y2="108" stroke={COLORS.cardLine} strokeWidth="1" />
      </g>
      {/* Coral badge — bell icon */}
      <g filter="url(#inbox-s)">
        <circle cx="148" cy="56" r="22" fill={COLORS.coralBadge} />
        {/* Bell silhouette */}
        <path
          d="M 148 44 C 142 44 138 48 138 56 L 136 64 L 160 64 L 158 56 C 158 48 154 44 148 44 Z"
          fill={COLORS.white}
        />
        <circle cx="148" cy="68" r="3" fill={COLORS.white} />
      </g>
    </svg>
  );
}

// ─── Company dashboard ─────────────────────────────────────────────

/** Post a task → tilted blank sheet + coral plus badge. */
export function PostTaskIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("post-s")}</defs>
      {/* Sheet */}
      <g transform="rotate(-6 100 100)" filter="url(#post-s)">
        <rect x="50" y="44" width="100" height="120" rx="6" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* Title underline */}
        <rect x="62" y="68" width="56" height="6" rx="3" fill={COLORS.peach} />
        {/* Blank lines */}
        <rect x="62" y="86" width="76" height="3" rx="1.5" fill={COLORS.cardLine} />
        <rect x="62" y="98" width="60" height="3" rx="1.5" fill={COLORS.cardLine} />
        <rect x="62" y="110" width="68" height="3" rx="1.5" fill={COLORS.cardLine} />
        <rect x="62" y="122" width="48" height="3" rx="1.5" fill={COLORS.cardLine} />
      </g>
      {/* Coral badge — plus sign */}
      <g filter="url(#post-s)">
        <circle cx="150" cy="148" r="22" fill={COLORS.coralBadge} />
        <line x1="150" y1="138" x2="150" y2="158" stroke={COLORS.white} strokeWidth="3.5" strokeLinecap="round" />
        <line x1="140" y1="148" x2="160" y2="148" stroke={COLORS.white} strokeWidth="3.5" strokeLinecap="round" />
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
      <g transform="rotate(-12 100 105)" filter="url(#subs-s)">
        <rect x="48" y="60" width="92" height="98" rx="8" fill={COLORS.blue} />
      </g>
      {/* Middle card */}
      <g transform="rotate(4 100 108)" filter="url(#subs-s)">
        <rect x="54" y="56" width="92" height="100" rx="8" fill={COLORS.beige} />
      </g>
      {/* Front card */}
      <g transform="rotate(-3 100 100)" filter="url(#subs-s)">
        <rect x="58" y="50" width="86" height="100" rx="8" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="68" y="72" width="46" height="5" rx="2.5" fill={COLORS.sage} />
        <rect x="68" y="86" width="60" height="3" rx="1.5" fill={COLORS.cardLine} />
        <rect x="68" y="96" width="48" height="3" rx="1.5" fill={COLORS.cardLine} />
      </g>
      {/* Sage badge — checkmark */}
      <g filter="url(#subs-s)">
        <circle cx="150" cy="146" r="22" fill={COLORS.sageBadge} />
        <path
          d="M 140 146 L 147 153 L 160 140"
          fill="none"
          stroke={COLORS.white}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** Deals → two cards meeting + a lavender heart-glow badge. */
export function DealsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("deals-s")}</defs>
      {/* Left card (coral wash) */}
      <g transform="rotate(-12 70 100)" filter="url(#deals-s)">
        <rect x="34" y="56" width="80" height="100" rx="8" fill={COLORS.coral} />
      </g>
      {/* Right card (blue wash) */}
      <g transform="rotate(12 130 100)" filter="url(#deals-s)">
        <rect x="86" y="56" width="80" height="100" rx="8" fill={COLORS.blue} />
      </g>
      {/* Lavender badge — handshake-ish glyph (simple two arrows) */}
      <g filter="url(#deals-s)">
        <circle cx="100" cy="100" r="26" fill={COLORS.lavenderBadge} />
        {/* Inverted "V" suggesting clasp */}
        <path
          d="M 86 96 L 100 108 L 114 96"
          fill="none"
          stroke={COLORS.white}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="86" y1="106" x2="114" y2="106" stroke={COLORS.white} strokeWidth="3.5" strokeLinecap="round" />
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
        <rect x="32" y="100" width="44" height="68" rx="6" fill={COLORS.beige} />
      </g>
      {/* 3rd place (right, shortest) */}
      <g filter="url(#lb-s)">
        <rect x="124" y="124" width="44" height="44" rx="6" fill={COLORS.sage} />
      </g>
      {/* 1st place (center, tallest) */}
      <g filter="url(#lb-s)">
        <rect x="78" y="76" width="44" height="92" rx="6" fill={COLORS.peach} />
      </g>
      {/* Coral badge with "1" */}
      <g filter="url(#lb-s)">
        <circle cx="100" cy="60" r="22" fill={COLORS.coralBadge} />
        <text
          x="100"
          y="69"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="22"
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

/** All tasks → clipboard tilted + sage check badge. */
export function AllTasksIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("at-s")}</defs>
      {/* Back card */}
      <g transform="rotate(8 110 100)" filter="url(#at-s)">
        <rect x="62" y="56" width="86" height="100" rx="6" fill={COLORS.lavender} />
      </g>
      {/* Front clipboard */}
      <g transform="rotate(-4 90 100)" filter="url(#at-s)">
        <rect x="50" y="50" width="92" height="116" rx="6" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        {/* Clip */}
        <rect x="80" y="42" width="32" height="14" rx="3" fill={COLORS.beige} />
        {/* Tasks list (with checkboxes) */}
        {[0, 1, 2, 3].map((i) => {
          const y = 76 + i * 18;
          const checked = i < 2;
          return (
            <g key={i}>
              <rect
                x="60"
                y={y}
                width="10"
                height="10"
                rx="2"
                fill={checked ? COLORS.sageBadge : COLORS.white}
                stroke={checked ? COLORS.sageBadge : COLORS.cardLine}
                strokeWidth="1"
              />
              {checked && (
                <path
                  d={`M ${62} ${y + 5} L ${64} ${y + 7} L ${68} ${y + 3}`}
                  fill="none"
                  stroke={COLORS.white}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <rect
                x="76"
                y={y + 3}
                width={42 + (i % 2 === 0 ? 12 : 0)}
                height="4"
                rx="2"
                fill={checked ? COLORS.cardLine : COLORS.coral}
                opacity={checked ? 0.7 : 1}
              />
            </g>
          );
        })}
      </g>
      {/* Sage badge — single check */}
      <g filter="url(#at-s)">
        <circle cx="150" cy="148" r="22" fill={COLORS.sageBadge} />
        <path
          d="M 140 148 L 147 155 L 160 142"
          fill="none"
          stroke={COLORS.white}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** Drafts → tilted sheet with a pencil edit badge. */
export function DraftsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>{shadowFilter("drafts-s")}</defs>
      {/* Sheet */}
      <g transform="rotate(-7 100 100)" filter="url(#drafts-s)">
        <rect x="50" y="44" width="100" height="120" rx="6" fill={COLORS.white} stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="62" y="64" width="56" height="6" rx="3" fill={COLORS.peach} />
        <rect x="62" y="82" width="76" height="3" rx="1.5" fill={COLORS.cardLine} />
        <rect x="62" y="94" width="60" height="3" rx="1.5" fill={COLORS.cardLine} />
        <rect x="62" y="106" width="68" height="3" rx="1.5" fill={COLORS.cardLine} />
        <rect x="62" y="118" width="48" height="3" rx="1.5" fill={COLORS.cardLine} />
      </g>
      {/* Lavender badge — pencil icon */}
      <g filter="url(#drafts-s)">
        <circle cx="150" cy="148" r="22" fill={COLORS.lavenderBadge} />
        {/* Simple pencil shape */}
        <g transform="rotate(45 150 148)">
          <rect x="142" y="138" width="16" height="6" rx="1" fill={COLORS.white} />
          <path d="M 158 138 L 162 141 L 158 144 Z" fill={COLORS.white} />
          <rect x="142" y="144" width="16" height="6" rx="1" fill={COLORS.white} opacity="0.85" />
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
