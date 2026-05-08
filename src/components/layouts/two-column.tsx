"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Two-column layout — main column + sticky right rail at >=1024px,
 * stacked on mobile. Use Tailwind for the breakpoint switch (the
 * codebase already runs Tailwind v4 with a `lg:` prefix at 1024px).
 */
interface TwoColumnProps {
  /** Main column. */
  children: ReactNode;
  /** Right rail. Sticky at >=lg. */
  aside: ReactNode;
  /** Right-rail width class. Defaults to "lg:w-[340px]". */
  asideWidthClass?: string;
  /** Gap class. Defaults to "gap-6". */
  gapClass?: string;
  /** Inline top offset for the sticky aside (px). Defaults to 80. */
  asideStickyTop?: number;
  className?: string;
  style?: CSSProperties;
}

export function TwoColumn({
  children,
  aside,
  asideWidthClass = "lg:w-[340px]",
  gapClass = "gap-6",
  asideStickyTop = 80,
  className = "",
  style,
}: TwoColumnProps) {
  return (
    <div
      className={`flex flex-col lg:flex-row ${gapClass} ${className}`}
      style={style}
    >
      <main className="min-w-0 flex-1">{children}</main>
      <aside
        className={`w-full ${asideWidthClass} flex-shrink-0`}
        style={{
          position: "sticky",
          top: asideStickyTop,
          alignSelf: "flex-start",
        }}
      >
        {aside}
      </aside>
    </div>
  );
}
