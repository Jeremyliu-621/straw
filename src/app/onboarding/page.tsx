"use client";

import { Suspense } from "react";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingProvider>
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: "var(--bg)" }}
        >
          <img
            src="/strawlonglogo.png"
            alt="Straw"
            className="h-5 w-auto"
            style={{ opacity: 0.3 }}
          />
        </div>
      </OnboardingProvider>
    </Suspense>
  );
}
