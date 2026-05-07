"use client";

import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import {
  SidebarProvider,
  useSidebar,
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
  TOPBAR_HEIGHT,
} from "@/components/dashboard/sidebar-context";
import {
  AskRailProvider,
  useAskRail,
  ASK_RAIL_WIDTH,
  ASK_GUTTER,
} from "@/components/dashboard/ask-rail-context";
import { AskRail } from "@/components/dashboard/ask-rail";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

/**
 * Dashboard shell. Two stacked providers:
 *   - SidebarProvider: collapsed/expanded width.
 *   - AskRailProvider: whether the ElevenLabs-style chat rail is
 *     open. When open, the dashboard frame insets into a rounded
 *     pill on the left and the AskRail anchors a 440px column on
 *     the right.
 *
 * Inset is driven entirely by CSS variables (--inset-*, --frame-
 * radius) set on the outer div. Sidebar/TopBar/Main read those vars
 * directly — no positional restructuring needed.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "company";

  return (
    <SidebarProvider>
      <AskRailProvider>
        <Frame role={role}>{children}</Frame>
      </AskRailProvider>
    </SidebarProvider>
  );
}

function Frame({ role, children }: { role: string; children: React.ReactNode }) {
  const { open: askOpen } = useAskRail();

  // CSS-var values describing the inset of the dashboard "card"
  // when the ask rail is open. Defaults are zero so the dashboard
  // sits flush against the viewport in normal mode.
  const insetTop = askOpen ? ASK_GUTTER : 0;
  const insetLeft = askOpen ? ASK_GUTTER : 0;
  const insetBottom = askOpen ? ASK_GUTTER : 0;
  // Right inset = rail width + gutter on each side of the rail.
  const insetRight = askOpen ? ASK_RAIL_WIDTH + ASK_GUTTER * 2 : 0;
  const frameRadius = askOpen ? 12 : 0;

  return (
    <div
      data-role={role}
      data-ask-open={askOpen ? "true" : "false"}
      className="flex min-h-screen"
      style={{
        background: askOpen ? "var(--bg-strong)" : "var(--bg)",
        transition: "background-color 0.24s ease",
        // Expose insets to descendants via custom properties. The
        // type assertion is the standard React idiom for inline CSS
        // custom properties.
        ...({
          "--inset-top": `${insetTop}px`,
          "--inset-left": `${insetLeft}px`,
          "--inset-right": `${insetRight}px`,
          "--inset-bottom": `${insetBottom}px`,
          "--frame-radius": `${frameRadius}px`,
        } as React.CSSProperties),
      }}
    >
      <Sidebar />
      <TopBar />
      <ShellMain>
        <OnboardingProvider>{children}</OnboardingProvider>
      </ShellMain>
      <AskRail />
    </div>
  );
}

/**
 * Renders the main content area; reads the sidebar's collapsed
 * state to set its left margin, and reads the ask rail's inset CSS
 * variables to round/inset itself when ask-mode is on.
 */
function ShellMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <main
      className="flex-1"
      style={{
        marginLeft: `calc(var(--inset-left, 0px) + ${sidebarWidth}px)`,
        marginTop: `calc(var(--inset-top, 0px) + ${TOPBAR_HEIGHT}px)`,
        marginRight: "var(--inset-right, 0px)",
        marginBottom: "var(--inset-bottom, 0px)",
        background: "var(--bg)",
        borderBottomRightRadius: "var(--frame-radius, 0px)",
        transition:
          "margin 0.24s ease, border-radius 0.24s ease, background-color 0.24s ease",
        minHeight:
          "calc(100vh - var(--inset-top, 0px) - var(--inset-bottom, 0px))",
      }}
    >
      <div className="mx-auto max-w-[1200px]" style={{ padding: "32px" }}>
        {children}
      </div>
    </main>
  );
}
