"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { ONBOARDING_STORAGE_KEY, ONBOARDING_SKIP_COOLDOWN_DAYS, ROLE_COMPANY } from "@/constants";
import type { UserRole } from "@/constants";
import { OnboardingModal } from "./OnboardingModal";
import { Step1Welcome } from "./steps/Step1Welcome";
import { Step2HowItWorks } from "./steps/Step2HowItWorks";
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

  // Default role for onboarding — role no longer gates permissions
  const userRole: UserRole = (session?.user?.role as UserRole) ?? ROLE_COMPANY;

  useEffect(() => {
    if (status === "loading") return;

    const state = loadOnboardingState();
    setOnboardingState(state);

    if (status !== "authenticated") {
      setPhase("done");
      return;
    }

    const needsOnboarding = session.user.onboarded === false;

    // If the session says not onboarded, clear any stale localStorage state
    // (e.g. after a dev reset) so the modal shows again
    if (needsOnboarding && (state.completed || state.skipped)) {
      const freshState = { ...DEFAULT_ONBOARDING_STATE, displayName: state.displayName };
      saveOnboardingState(freshState);
      setOnboardingState(freshState);
      setPhase("onboarding");
      return;
    }

    if (needsOnboarding && !state.completed && !state.skipped) {
      setPhase("onboarding");
    } else if (state.completed && !state.tourCompleted) {
      setPhase("tour");
    } else {
      setPhase("done");
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setOnboardingState((prev) => {
      const newState = { ...prev, ...updates };
      saveOnboardingState(newState);
      return newState;
    });
  }, []);

  const handleNext = useCallback(async () => {
    if (onboardingState.currentStep < 2) {
      updateState({ currentStep: onboardingState.currentStep + 1 });
    } else {
      // Final step: call API, then start tour in-place
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: onboardingState.displayName || session?.user?.name || "User",
            role: userRole,
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

          // Dismiss modal, then smoothly start tour — no navigation needed
          setPhase("done");
          setTimeout(() => setPhase("tour"), 600);
        }
      } catch {
        setPhase("done");
      }
    }
  }, [onboardingState, session, update, updateState, userRole]);

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

    // Still need to call the API to create profiles
    fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: onboardingState.displayName || session?.user?.name || "User",
        role: userRole,
      }),
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        await update({ onboarded: true, role: data.role });
      }
    });
  }, [updateState, onboardingState.displayName, session, update, userRole]);

  const handleDisplayNameChange = useCallback(
    (name: string) => {
      updateState({ displayName: name });
    },
    [updateState]
  );

  const backVisible = onboardingState.currentStep > 1;
  const skipVisible = onboardingState.currentStep < 2;
  const stepLabels: Record<number, string> = {
    1: "Continue",
    2: "Go to dashboard",
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
          totalSteps={2}
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
