"use client";

import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/sidebar";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "company";

  return (
    <div
      data-role={role}
      className="flex min-h-screen"
      style={{ background: "var(--bg)", transition: "background-color 0.3s ease" }}
    >
      <Sidebar />
      <main className="flex-1" style={{ marginLeft: "240px" }}>
        <OnboardingProvider>
          <div className="mx-auto max-w-[1200px]" style={{ padding: "32px" }}>
            {children}
          </div>
        </OnboardingProvider>
      </main>
    </div>
  );
}
