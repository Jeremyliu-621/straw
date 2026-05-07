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
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "company";

  return (
    <SidebarProvider>
      <div
        data-role={role}
        className="flex min-h-screen"
        style={{ background: "var(--bg)", transition: "background-color 0.3s ease" }}
      >
        <Sidebar />
        <TopBar />
        <ShellMain>
          <OnboardingProvider>{children}</OnboardingProvider>
        </ShellMain>
      </div>
    </SidebarProvider>
  );
}

/**
 * Renders the main content area; reads the sidebar's collapsed state to
 * adjust its left margin. Lives inside SidebarProvider so it can use
 * the hook.
 */
function ShellMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <main
      className="flex-1"
      style={{
        marginLeft: `${sidebarWidth}px`,
        marginTop: `${TOPBAR_HEIGHT}px`,
        transition: "margin-left 0.18s ease",
      }}
    >
      <div className="mx-auto max-w-[1200px]" style={{ padding: "32px" }}>
        {children}
      </div>
    </main>
  );
}
