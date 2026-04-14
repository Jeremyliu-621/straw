"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy /onboarding route — redirects to the dashboard where
 * the OnboardingProvider shows the wizard overlay.
 */
export default function OnboardingPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
