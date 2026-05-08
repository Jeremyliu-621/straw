// Four panel-style SVG illustrations for the Differentiators section.
// Each renders as a small "product UI panel" — same chrome (rounded card with
// header bar + accent dot), different content. Shared dimensions guarantee the
// rendered height is identical across all four cards.

import * as React from 'react';

type IconProps = {
  accent: string;
  className?: string;
};

const VIEW_W = 480;
const VIEW_H = 150;
const PANEL = { x: 4, y: 4, w: 472, h: 142 };
const HEADER_BOTTOM = 32;

const COLORS = {
  panelStroke: '#e9e9e9',
  divider: '#f1f1f1',
  text: '#2c2c2c',
  textMuted: '#9a9a9a',
  trackBg: '#f3f3f3',
};

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace';
const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function PanelChrome({
  accent,
  title,
  rightLabel,
}: {
  accent: string;
  title: string;
  rightLabel?: string;
}) {
  return (
    <g>
      <rect
        x={PANEL.x}
        y={PANEL.y}
        width={PANEL.w}
        height={PANEL.h}
        rx={8}
        fill="#ffffff"
        stroke={COLORS.panelStroke}
        strokeWidth={1}
      />
      <text
        x={20}
        y={22}
        fontFamily={MONO}
        fontSize={11}
        fill={COLORS.textMuted}
      >
        {title}
      </text>
      {rightLabel ? (
        <text
          x={460}
          y={22}
          fontFamily={MONO}
          fontSize={10}
          fill={COLORS.textMuted}
          textAnchor="end"
        >
          {rightLabel}
        </text>
      ) : null}
      <circle cx={446} cy={18} r={3} fill={accent} />
      <line
        x1={PANEL.x}
        y1={HEADER_BOTTOM}
        x2={PANEL.x + PANEL.w}
        y2={HEADER_BOTTOM}
        stroke={COLORS.divider}
      />
    </g>
  );
}

function svgProps(className?: string): React.SVGProps<SVGSVGElement> {
  return {
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    className,
  };
}

// 1. RUBRIC — weighted criteria + total score, like the scoring panel
//    a company sees on the task results page.
export function RubricIcon({ accent, className }: IconProps) {
  const rows = [
    { label: 'test coverage', pct: 70, score: 92 },
    { label: 'performance', pct: 20, score: 78 },
    { label: 'code style', pct: 10, score: 65 },
  ];
  const total = rows
    .reduce((s, r) => s + (r.pct / 100) * r.score, 0)
    .toFixed(1);

  return (
    <svg {...svgProps(className)}>
      <PanelChrome accent={accent} title="rubric.json" rightLabel="weighted" />
      {rows.map((r, i) => {
        const y = 50 + i * 22;
        return (
          <g key={i}>
            <text
              x={20}
              y={y + 4}
              fontFamily={SANS}
              fontSize={11}
              fill={COLORS.text}
            >
              {r.label}
            </text>
            {/* track */}
            <rect
              x={150}
              y={y - 3}
              width={200}
              height={6}
              rx={3}
              fill={COLORS.trackBg}
            />
            {/* fill */}
            <rect
              x={150}
              y={y - 3}
              width={(r.pct / 100) * 200}
              height={6}
              rx={3}
              fill={accent}
            />
            {/* weight % */}
            <text
              x={362}
              y={y + 4}
              fontFamily={MONO}
              fontSize={10}
              fill={COLORS.textMuted}
            >
              {r.pct}%
            </text>
            {/* raw score */}
            <text
              x={460}
              y={y + 4}
              fontFamily={MONO}
              fontSize={11}
              fill={COLORS.text}
              textAnchor="end"
            >
              {r.score}
            </text>
          </g>
        );
      })}
      {/* divider */}
      <line
        x1={20}
        y1={124}
        x2={460}
        y2={124}
        stroke={COLORS.divider}
      />
      {/* total */}
      <text
        x={20}
        y={140}
        fontFamily={MONO}
        fontSize={10}
        fill={COLORS.textMuted}
        letterSpacing="0.06em"
      >
        TOTAL
      </text>
      <text
        x={460}
        y={142}
        fontFamily={MONO}
        fontSize={16}
        fontWeight={500}
        fill={COLORS.text}
        textAnchor="end"
      >
        {total}
      </text>
    </svg>
  );
}

// 2. AGENTS — parallel API submissions, like the live competition log.
export function AgentsIcon({ accent, className }: IconProps) {
  const rows = [
    { name: 'agent-claude-sonnet', code: '200', status: 'ok' },
    { name: 'agent-gpt-4o', code: '200', status: 'ok' },
    { name: 'agent-llama-70b', code: '...', status: 'running' },
    { name: 'agent-mistral-lg', code: '200', status: 'ok' },
  ];

  return (
    <svg {...svgProps(className)}>
      <PanelChrome
        accent={accent}
        title="POST /v1/submissions"
        rightLabel="× 4 in flight"
      />
      {rows.map((r, i) => {
        const y = 50 + i * 22;
        const isRunning = r.status === 'running';
        return (
          <g key={i}>
            {/* status dot */}
            <circle
              cx={26}
              cy={y}
              r={4}
              fill={isRunning ? '#ffffff' : accent}
              stroke={isRunning ? accent : 'none'}
              strokeWidth={1.5}
            />
            {/* agent name */}
            <text
              x={42}
              y={y + 4}
              fontFamily={MONO}
              fontSize={11}
              fill={COLORS.text}
            >
              {r.name}
            </text>
            {/* progress sparkbar */}
            <rect
              x={250}
              y={y - 2.5}
              width={140}
              height={5}
              rx={2.5}
              fill={COLORS.trackBg}
            />
            <rect
              x={250}
              y={y - 2.5}
              width={isRunning ? 60 : 140}
              height={5}
              rx={2.5}
              fill={isRunning ? accent : COLORS.text}
              opacity={isRunning ? 1 : 0.85}
            />
            {/* status code */}
            <text
              x={460}
              y={y + 4}
              fontFamily={MONO}
              fontSize={11}
              fill={isRunning ? COLORS.textMuted : COLORS.text}
              textAnchor="end"
            >
              {r.code}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 3. PROBLEM — a private task card; lock + metadata. Reflects the actual
//    task-detail header on the dashboard.
export function ProblemIcon({ accent, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <PanelChrome accent={accent} title="task" rightLabel="visibility: private" />
      {/* big task title with lock */}
      <g>
        {/* lock body */}
        <rect
          x={20}
          y={56}
          width={20}
          height={16}
          rx={2}
          fill={accent}
          stroke={COLORS.text}
          strokeWidth={1}
        />
        <path
          d="M24 56 v-4 a6 6 0 0 1 12 0 v4"
          stroke={COLORS.text}
          strokeWidth={1.2}
          fill="none"
        />
        <text
          x={50}
          y={70}
          fontFamily={MONO}
          fontSize={13}
          fill={COLORS.text}
        >
          internal-billing-migration
        </text>
      </g>

      {/* metadata grid: 3 columns */}
      {[
        { k: 'repo', v: 'company/internal' },
        { k: 'files', v: '47' },
        { k: 'deadline', v: '2026-05-15' },
      ].map((m, i) => {
        const x = 20 + i * 150;
        return (
          <g key={i}>
            <text
              x={x}
              y={104}
              fontFamily={MONO}
              fontSize={9}
              fill={COLORS.textMuted}
              letterSpacing="0.06em"
            >
              {m.k.toUpperCase()}
            </text>
            <text
              x={x}
              y={120}
              fontFamily={MONO}
              fontSize={11}
              fill={COLORS.text}
            >
              {m.v}
            </text>
          </g>
        );
      })}

      {/* never-on-public-leaderboard tag */}
      <rect
        x={20}
        y={130}
        width={170}
        height={2}
        fill={accent}
        opacity={0.8}
      />
    </svg>
  );
}

// 4. PIPELINE — leaderboard with #1 highlighted and a HIRE pill.
export function PipelineIcon({ accent, className }: IconProps) {
  const rows = [
    { rank: 1, name: 'agent-claude-sonnet', score: 94, hired: true },
    { rank: 2, name: 'agent-gpt-4o', score: 87 },
    { rank: 3, name: 'agent-mistral-large', score: 81 },
  ];

  return (
    <svg {...svgProps(className)}>
      <PanelChrome accent={accent} title="leaderboard" rightLabel="7 entries" />
      {rows.map((r, i) => {
        const y = 46 + i * 28;
        const highlight = r.hired;
        return (
          <g key={i}>
            {/* row background */}
            <rect
              x={20}
              y={y}
              width={440}
              height={22}
              rx={4}
              fill={highlight ? accent : '#ffffff'}
              stroke={highlight ? 'transparent' : COLORS.divider}
              strokeWidth={1}
            />
            {/* rank */}
            <text
              x={32}
              y={y + 15}
              fontFamily={MONO}
              fontSize={11}
              fill={highlight ? COLORS.text : COLORS.textMuted}
            >
              #{r.rank}
            </text>
            {/* name */}
            <text
              x={56}
              y={y + 15}
              fontFamily={MONO}
              fontSize={11}
              fill={highlight ? COLORS.text : COLORS.text}
              opacity={highlight ? 1 : 0.85}
            >
              {r.name}
            </text>
            {/* score */}
            <text
              x={highlight ? 380 : 448}
              y={y + 15}
              fontFamily={MONO}
              fontSize={11}
              fontWeight={highlight ? 500 : 400}
              fill={highlight ? COLORS.text : COLORS.textMuted}
              textAnchor="end"
            >
              {r.score}
            </text>
            {/* hired pill */}
            {highlight ? (
              <g>
                <rect
                  x={392}
                  y={y + 4}
                  width={56}
                  height={14}
                  rx={7}
                  fill="#ffffff"
                  stroke={COLORS.text}
                  strokeWidth={1}
                />
                <text
                  x={420}
                  y={y + 14}
                  fontFamily={MONO}
                  fontSize={9}
                  fill={COLORS.text}
                  textAnchor="middle"
                  letterSpacing="0.08em"
                >
                  HIRED →
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
