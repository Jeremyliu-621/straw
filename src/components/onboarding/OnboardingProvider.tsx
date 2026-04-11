"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { ONBOARDING_STORAGE_KEY, ONBOARDING_SKIP_COOLDOWN_DAYS, ROLE_COMPANY } from "@/constants";
import type { UserRole } from "@/constants";
import { OnboardingModal } from "./OnboardingModal";
import { Step1Welcome } from "./steps/Step1Welcome";
import { Step2HowItWorks } from "./steps/Step2HowItWorks";
import { Step3Ready } from "./steps/Step3Ready";
import { TourProvider } from "./tour/TourProvider";
import type { OnboardingState } from "./types";
import { DEFAULT_ONBOARDING_STATE } from "./types";

function loadOnboardingState(): OnboardingState {
  if (typeof window === "undefined") return DEFAULT_ONBOARDING_STATE;

  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!stored) return DEFAULT_ONBOARDING_STATE;

    const state = JSON.parse(stored) as OnboardingState;

    // Re-show if skip cooldown has expired
    if (state.skipped && state.skippedAt) {
      const skippedDate = new Date(state.skippedAt);
      const now = new Date();
      const daysPassed = (now.getTime() - skippedDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysPassed > ONBOARDING_SKIP_COOLDOWN_DAYS) {
        return {
          ...DEFAULT_ONBOARDING_STATE,
          displayName: state.displayName,
        };
      }
    }

    return state;
  } catch {
    return DEFAULT_ONBOARDING_STATE;
  }
}

function saveOnboardingState(state: OnboardingState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
}

type FlowPhase = "loading" | "onboarding" | "tour" | "done";

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<FlowPhase>("loading");
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);

  const isOnboardingPage = pathname === "/onboarding";

  // Determine role: from session or default to company
  const userRole: UserRole = (session?.user?.role as UserRole) ?? ROLE_COMPANY;

  useEffect(() => {
    if (status === "loading") return;

    const state = loadOnboardingState();
    setOnboardingState(state);

    if (status !== "authenticated") {
      setPhase("done");
      return;
    }

    if (isOnboardingPage) {
      // On the onboarding page, show the modal wizard
      if (!state.completed && !state.skipped) {
        setPhase("onboarding");
      } else {
        // Already completed, redirect to dashboard
        router.push("/dashboard");
        setPhase("done");
      }
    } else {
      // On dashboard pages, check if tour needs to run
      if (state.completed && !state.tourCompleted) {
        setPhase("tour");
      } else {
        setPhase("done");
      }
    }
  }, [status, isOnboardingPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setOnboardingState((prev) => {
      const newState = { ...prev, ...updates };
      saveOnboardingState(newState);
      return newState;
    });
  }, []);

  const handleNext = useCallback(async () => {
    if (onboardingState.currentStep < 3) {
      updateState({ currentStep: onboardingState.currentStep + 1 });
    } else {
      // Final step: call API, then go to dashboard
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: onboardingState.displayName || session?.user?.name || "User",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          await update({ onboarded: true, role: data.role });

          updateState({
            completed: true,
            completedAt: new Date().toISOString(),
            tourCurrentStep: 1,
          });

          // Close modal, start tour after navigation
          setPhase("done");
          router.push("/dashboard");

          // Tour will activate when OnboardingProvider mounts in dashboard layout
          setTimeout(() => setPhase("tour"), 800);
        }
      } catch {
        // Network error - just proceed to dashboard
        router.push("/dashboard");
      }
    }
  }, [onboardingState, session, update, updateState, router]);

  const handleBack = useCallback(() => {
    if (onboardingState.currentStep > 1) {
      updateState({ currentStep: onboardingState.currentStep - 1 });
    }
  }, [onboardingState.currentStep, updateState]);

  const handleSkip = useCallback(() => {
    updateState({
      skipped: true,
      skippedAt: new Date().toISOString(),
    });
    setPhase("done");
    if (isOnboardingPage) {
      // Still need to call the API to create profiles
      fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: onboardingState.displayName || session?.user?.name || "User",
        }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          await update({ onboarded: true, role: data.role });
          router.push("/dashboard");
        }
      });
    }
  }, [updateState, isOnboardingPage, onboardingState.displayName, session, update, router]);

  const handleDisplayNameChange = useCallback(
    (name: string) => {
      updateState({ displayName: name });
    },
    [updateState]
  );

  const backVisible = onboardingState.currentStep > 1;
  const skipVisible = onboardingState.currentStep < 3;
  const stepLabels: Record<number, string> = {
    1: "Continue",
    2: "Continue",
    3: "Go to dashboard",
  };

  const getStepContent = () => {
    switch (onboardingState.currentStep) {
      case 1:
        return (
          <Step1Welcome
            displayName={onboardingState.displayName}
            onDisplayNameChange={handleDisplayNameChange}
          />
        );
      case 2:
        return <Step2HowItWorks role={userRole} />;
      case 3:
        return <Step3Ready role={userRole} displayName={onboardingState.displayName} />;
      default:
        return null;
    }
  };

  const showModal = phase === "onboarding";
  const tourActive = phase === "tour";

  const nextDisabled = onboardingState.currentStep === 1 && !onboardingState.displayName.trim();

  return (
    <TourProvider active={tourActive}>
      {children}
      {showModal && (
        <OnboardingModal
          isOpen={true}
          onClose={handleSkip}
          currentStep={onboardingState.currentStep}
          totalSteps={3}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={handleSkip}
          nextLabel={stepLabels[onboardingState.currentStep] || "Continue"}
          nextDisabled={nextDisabled}
          backVisible={backVisible}
          skipVisible={skipVisible}
        >
          {getStepContent()}
        </OnboardingModal>
      )}
    </TourProvider>
  );
}
