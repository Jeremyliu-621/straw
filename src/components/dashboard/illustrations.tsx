// Tool-card illustrations — twelve inline SVGs in the ElevenLabs
// "scrapbook" style. Each one layers three flat shapes:
//
// 1. A big main element with a SUBTLE linear/radial gradient (so it
//    reads as a "real" textured object — paper, metal disk, etc.)
// 2. A flat solid-color pill with a white inner pattern
// 3. A flat solid-color circle badge with a white icon glyph
//
// NO drop shadows anywhere — clean cutout intersections like cut
// paper pasted on a card. Each element is rotated slightly for
// energy. Z-order matters: pill and badge sit ON TOP of the main
// element so they read as "stuck on".

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
  // Dusty saturated badge / pill colors
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

// ─── Agent dashboard ────────────────────────────────────────────────

/** Compete → big task card + lavender VS pill + coral swords badge. */
export function ArenaIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <linearGradient id="arena-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f5f3f1" />
        </linearGradient>
      </defs>
      {/* Main: tilted task card */}
      <g transform="rotate(-7 100 100)">
        <rect x="46" y="44" width="108" height="124" rx="12" fill="url(#arena-card)" stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="60" y="68" width="80" height="14" rx="4" fill={COLORS.coral} />
        <rect x="60" y="92" width="64" height="6" rx="3" fill={COLORS.cardLine} />
        <rect x="60" y="106" width="48" height="6" rx="3" fill={COLORS.cardLine} />
      </g>
      {/* Lavender pill — "VS" representation */}
      <g transform="rotate(8 130 56)">
        <rect x="100" y="44" width="60" height="24" rx="12" fill={COLORS.lavenderBadge} />
        <text x="130" y="61" fontFamily="ui-sans-serif" fontSize="13" fontWeight="700" textAnchor="middle" fill={COLORS.white}>VS</text>
      </g>
      {/* Coral badge — swords */}
      <circle cx="58" cy="146" r="28" fill={COLORS.coralBadge} />
      <line x1="44" y1="132" x2="72" y2="160" stroke={COLORS.white} strokeWidth="4" strokeLinecap="round" />
      <line x1="72" y1="132" x2="44" y2="160" stroke={COLORS.white} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** In flight → big card + peach speed pill + peach paper-plane badge. */
export function SubmissionIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <linearGradient id="sub-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f5f3f1" />
        </linearGradient>
      </defs>
      {/* Tilted card */}
      <g transform="rotate(-9 100 100)">
        <rect x="46" y="40" width="108" height="124" rx="12" fill="url(#sub-card)" stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="62" y="68" width="76" height="12" rx="4" fill={COLORS.peach} />
        <rect x="62" y="90" width="60" height="6" rx="3" fill={COLORS.cardLine} />
      </g>
      {/* Peach pill — bottom-left, looks like a wave/progress */}
      <g transform="rotate(-6 60 142)">
        <rect x="20" y="130" width="80" height="24" rx="12" fill={COLORS.peachBadge} />
        {/* Three small speed-line marks inside */}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={32 + i * 14} y="138" width="3" height="8" rx="1.5" fill={COLORS.white} />
        ))}
      </g>
      {/* Peach badge — paper plane */}
      <circle cx="146" cy="148" r="28" fill={COLORS.peachBadge} />
      <path d="M 132 150 L 162 134 L 156 162 L 148 154 L 142 158 Z" fill={COLORS.white} />
    </svg>
  );
}

/** Reputation → big medal disk + lavender star badge. */
export function ReputationIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <radialGradient id="rep-medal" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fce0db" />
          <stop offset="100%" stopColor={COLORS.coralBadge} />
        </radialGradient>
      </defs>
      {/* Big medal disk (gradient = "real" object feel) */}
      <circle cx="92" cy="100" r="58" fill="url(#rep-medal)" />
      {/* Inner ring detail */}
      <circle cx="92" cy="100" r="44" fill="none" stroke={COLORS.white} strokeWidth="3" opacity="0.55" />
      {/* Center star */}
      <path
        d="M 92 76 L 98 92 L 114 94 L 102 105 L 106 121 L 92 113 L 78 121 L 82 105 L 70 94 L 86 92 Z"
        fill={COLORS.white}
        opacity="0.95"
      />
      {/* Lavender pill — small "rank" tag */}
      <g transform="rotate(-12 60 158)">
        <rect x="34" y="148" width="52" height="22" rx="11" fill={COLORS.lavenderBadge} />
        <text x="60" y="164" fontFamily="ui-sans-serif" fontSize="13" fontWeight="700" textAnchor="middle" fill={COLORS.white}>★ A</text>
      </g>
      {/* Lavender badge — star */}
      <circle cx="148" cy="56" r="28" fill={COLORS.lavenderBadge} />
      <path
        d="M 148 38 L 153 52 L 167 53 L 156 62 L 161 75 L 148 67 L 135 75 L 140 62 L 129 53 L 143 52 Z"
        fill={COLORS.white}
      />
    </svg>
  );
}

/** Earnings → big card with chart + coral pill + coral $ badge. */
export function EarningsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <linearGradient id="earn-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f5f3f1" />
        </linearGradient>
      </defs>
      {/* Big card */}
      <g transform="rotate(-7 100 100)">
        <rect x="46" y="40" width="108" height="120" rx="12" fill="url(#earn-card)" stroke={COLORS.cardLine} strokeWidth="1" />
        {/* Filled-area chart */}
        <path d="M 60 134 L 60 110 L 80 92 L 102 102 L 120 78 L 142 88 L 142 134 Z" fill={COLORS.peach} opacity="0.7" />
        <polyline points="60,110 80,92 102,102 120,78 142,88" fill="none" stroke={COLORS.coralBadge} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      </g>
      {/* Pill — "+12%" indicator */}
      <g transform="rotate(-3 60 60)">
        <rect x="30" y="48" width="62" height="24" rx="12" fill={COLORS.sageBadge} />
        <text x="61" y="65" fontFamily="ui-sans-serif" fontSize="13" fontWeight="700" textAnchor="middle" fill={COLORS.white}>+12%</text>
      </g>
      {/* Coral badge — $ */}
      <circle cx="148" cy="148" r="28" fill={COLORS.coralBadge} />
      <text x="148" y="159" fontFamily="ui-sans-serif" fontSize="30" fontWeight="700" textAnchor="middle" fill={COLORS.white}>$</text>
    </svg>
  );
}

/** Workspace → stacked folders + blue folder badge. */
export function WorkspaceIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <linearGradient id="ws-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe4dd" />
          <stop offset="100%" stopColor={COLORS.beige} />
        </linearGradient>
        <linearGradient id="ws-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e3def5" />
          <stop offset="100%" stopColor={COLORS.lavender} />
        </linearGradient>
      </defs>
      {/* Back folder */}
      <g transform="rotate(8 110 100)">
        <path d="M 60 60 L 86 60 L 96 70 L 156 70 L 156 154 L 60 154 Z" fill="url(#ws-back)" />
      </g>
      {/* Front folder */}
      <g transform="rotate(-6 90 100)">
        <path d="M 44 50 L 70 50 L 80 60 L 152 60 L 152 158 L 44 158 Z" fill="url(#ws-front)" />
        <rect x="56" y="80" width="80" height="6" rx="3" fill={COLORS.cardLine} />
        <rect x="56" y="98" width="60" height="6" rx="3" fill={COLORS.cardLine} />
      </g>
      {/* Blue badge — folder */}
      <circle cx="150" cy="148" r="28" fill={COLORS.blueBadge} />
      <path d="M 134 138 L 142 138 L 146 142 L 166 142 L 166 160 L 134 160 Z" fill={COLORS.white} />
    </svg>
  );
}

/** Inbox → big envelope + coral pill + coral bell badge. */
export function InboxIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <linearGradient id="inbox-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f5f3f1" />
        </linearGradient>
        <linearGradient id="inbox-flap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe4dd" />
          <stop offset="100%" stopColor={COLORS.beige} />
        </linearGradient>
      </defs>
      {/* Envelope */}
      <g transform="rotate(-5 100 102)">
        <rect x="32" y="56" width="136" height="92" rx="8" fill="url(#inbox-body)" stroke={COLORS.cardLine} strokeWidth="1" />
        <path d="M 32 56 L 100 110 L 168 56 Z" fill="url(#inbox-flap)" />
        <line x1="32" y1="148" x2="86" y2="100" stroke={COLORS.cardLine} strokeWidth="1.5" />
        <line x1="168" y1="148" x2="114" y2="100" stroke={COLORS.cardLine} strokeWidth="1.5" />
      </g>
      {/* Pill — "3 new" */}
      <g transform="rotate(-8 56 158)">
        <rect x="28" y="146" width="56" height="24" rx="12" fill={COLORS.coralBadge} />
        <text x="56" y="163" fontFamily="ui-sans-serif" fontSize="13" fontWeight="700" textAnchor="middle" fill={COLORS.white}>3 new</text>
      </g>
      {/* Coral badge — bell */}
      <circle cx="150" cy="56" r="28" fill={COLORS.coralBadge} />
      <path d="M 150 40 C 142 40 138 46 138 56 L 134 66 L 166 66 L 162 56 C 162 46 158 40 150 40 Z" fill={COLORS.white} />
      <circle cx="150" cy="70" r="3.5" fill={COLORS.white} />
    </svg>
  );
}

// ─── Company dashboard ─────────────────────────────────────────────

/** Post a task → big sheet + coral plus badge. */
export function PostTaskIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <linearGradient id="post-sheet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f5f3f1" />
        </linearGradient>
      </defs>
      <g transform="rotate(-7 100 100)">
        <rect x="44" y="36" width="112" height="132" rx="10" fill="url(#post-sheet)" stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="60" y="60" width="76" height="14" rx="4" fill={COLORS.peach} />
        <rect x="60" y="92" width="84" height="6" rx="3" fill={COLORS.cardLine} />
        <rect x="60" y="108" width="60" height="6" rx="3" fill={COLORS.cardLine} />
      </g>
      {/* Coral pill — "draft" tag */}
      <g transform="rotate(-3 50 60)">
        <rect x="22" y="48" width="58" height="22" rx="11" fill={COLORS.coralBadge} />
        <text x="51" y="64" fontFamily="ui-sans-serif" fontSize="11" fontWeight="700" textAnchor="middle" fill={COLORS.white}>NEW</text>
      </g>
      {/* Coral badge — plus */}
      <circle cx="150" cy="148" r="28" fill={COLORS.coralBadge} />
      <line x1="150" y1="134" x2="150" y2="162" stroke={COLORS.white} strokeWidth="4.5" strokeLinecap="round" />
      <line x1="136" y1="148" x2="164" y2="148" stroke={COLORS.white} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

/** Submissions → fanned card stack + sage check badge. */
export function SubmissionsStackIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <linearGradient id="subs-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f5f3f1" />
        </linearGradient>
        <linearGradient id="subs-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dde2ee" />
          <stop offset="100%" stopColor={COLORS.blue} />
        </linearGradient>
        <linearGradient id="subs-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe4dd" />
          <stop offset="100%" stopColor={COLORS.beige} />
        </linearGradient>
      </defs>
      <g transform="rotate(-14 100 110)">
        <rect x="42" y="56" width="100" height="116" rx="10" fill="url(#subs-back)" />
      </g>
      <g transform="rotate(5 100 110)">
        <rect x="48" y="50" width="100" height="116" rx="10" fill="url(#subs-mid)" />
      </g>
      <g transform="rotate(-3 100 100)">
        <rect x="50" y="44" width="98" height="116" rx="10" fill="url(#subs-front)" stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="64" y="68" width="60" height="10" rx="4" fill={COLORS.sage} />
      </g>
      {/* Sage badge — check */}
      <circle cx="150" cy="148" r="28" fill={COLORS.sageBadge} />
      <path d="M 138 148 L 147 157 L 162 140" fill="none" stroke={COLORS.white} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Deals → two cards meeting + lavender handshake badge. */
export function DealsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <linearGradient id="deals-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6ddd6" />
          <stop offset="100%" stopColor={COLORS.coral} />
        </linearGradient>
        <linearGradient id="deals-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dde2ee" />
          <stop offset="100%" stopColor={COLORS.blue} />
        </linearGradient>
      </defs>
      <g transform="rotate(-15 65 100)">
        <rect x="22" y="44" width="86" height="116" rx="10" fill="url(#deals-left)" />
      </g>
      <g transform="rotate(15 135 100)">
        <rect x="92" y="44" width="86" height="116" rx="10" fill="url(#deals-right)" />
      </g>
      <circle cx="100" cy="100" r="32" fill={COLORS.lavenderBadge} />
      <path d="M 84 96 L 100 110 L 116 96" fill="none" stroke={COLORS.white} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="84" y1="108" x2="116" y2="108" stroke={COLORS.white} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

/** Leaderboard → 3-tier podium + coral "1" badge. */
export function LeaderboardIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <linearGradient id="lb-1st" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbe1dc" />
          <stop offset="100%" stopColor={COLORS.peach} />
        </linearGradient>
        <linearGradient id="lb-2nd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebe4dd" />
          <stop offset="100%" stopColor={COLORS.beige} />
        </linearGradient>
        <linearGradient id="lb-3rd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dde6dd" />
          <stop offset="100%" stopColor={COLORS.sage} />
        </linearGradient>
      </defs>
      <rect x="26" y="92" width="50" height="80" rx="6" fill="url(#lb-2nd)" />
      <rect x="124" y="120" width="50" height="52" rx="6" fill="url(#lb-3rd)" />
      <rect x="75" y="64" width="50" height="108" rx="6" fill="url(#lb-1st)" />
      {/* Coral badge with "1" */}
      <circle cx="100" cy="48" r="26" fill={COLORS.coralBadge} />
      <text x="100" y="59" fontFamily="ui-sans-serif" fontSize="28" fontWeight="700" textAnchor="middle" fill={COLORS.white}>1</text>
    </svg>
  );
}

/** All tasks → clipboard + sage check pill (filled tasks). */
export function AllTasksIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <linearGradient id="at-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f5f3f1" />
        </linearGradient>
        <linearGradient id="at-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e3def5" />
          <stop offset="100%" stopColor={COLORS.lavender} />
        </linearGradient>
      </defs>
      <g transform="rotate(8 110 100)">
        <rect x="58" y="50" width="92" height="116" rx="8" fill="url(#at-back)" />
      </g>
      <g transform="rotate(-5 90 100)">
        <rect x="44" y="44" width="100" height="124" rx="8" fill="url(#at-front)" stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="78" y="36" width="32" height="16" rx="4" fill={COLORS.beige} />
        {[0, 1, 2].map((i) => {
          const y = 76 + i * 24;
          const checked = i < 2;
          return (
            <g key={i}>
              <rect x="56" y={y} width="14" height="14" rx="3" fill={checked ? COLORS.sageBadge : COLORS.white} stroke={checked ? COLORS.sageBadge : COLORS.cardLine} strokeWidth="1.5" />
              {checked && <path d={`M ${59} ${y + 7} L ${62} ${y + 10} L ${68} ${y + 4}`} fill="none" stroke={COLORS.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
              <rect x="78" y={y + 4} width={i === 0 ? 50 : i === 1 ? 38 : 56} height="6" rx="3" fill={checked ? COLORS.cardLine : COLORS.coral} opacity={checked ? 0.7 : 1} />
            </g>
          );
        })}
      </g>
      {/* Sage pill — "12 done" */}
      <g transform="rotate(8 50 50)">
        <rect x="20" y="38" width="60" height="22" rx="11" fill={COLORS.sageBadge} />
        <text x="50" y="54" fontFamily="ui-sans-serif" fontSize="11" fontWeight="700" textAnchor="middle" fill={COLORS.white}>12 DONE</text>
      </g>
    </svg>
  );
}

/** Drafts → big sheet + lavender pencil badge. */
export function DraftsIllustration({ className }: IllustrationProps) {
  return (
    <svg {...svgProps(className)}>
      <defs>
        <linearGradient id="drafts-sheet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f5f3f1" />
        </linearGradient>
      </defs>
      <g transform="rotate(-7 100 100)">
        <rect x="44" y="36" width="112" height="132" rx="8" fill="url(#drafts-sheet)" stroke={COLORS.cardLine} strokeWidth="1" />
        <rect x="60" y="60" width="76" height="14" rx="4" fill={COLORS.peach} />
        <rect x="60" y="92" width="80" height="6" rx="3" fill={COLORS.cardLine} />
        <rect x="60" y="108" width="64" height="6" rx="3" fill={COLORS.cardLine} />
      </g>
      {/* Lavender pill — "DRAFT" tag */}
      <g transform="rotate(-12 60 56)">
        <rect x="28" y="44" width="68" height="22" rx="11" fill={COLORS.lavenderBadge} />
        <text x="62" y="60" fontFamily="ui-sans-serif" fontSize="11" fontWeight="700" textAnchor="middle" fill={COLORS.white}>DRAFT</text>
      </g>
      {/* Lavender badge — pencil */}
      <circle cx="150" cy="148" r="28" fill={COLORS.lavenderBadge} />
      <g transform="rotate(45 150 148)">
        <rect x="138" y="138" width="20" height="8" rx="2" fill={COLORS.white} />
        <rect x="138" y="146" width="20" height="8" rx="2" fill={COLORS.white} opacity="0.85" />
        <path d="M 158 138 L 166 142 L 158 146 Z" fill={COLORS.white} />
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
