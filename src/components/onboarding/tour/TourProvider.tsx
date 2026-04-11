"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ROLE_COMPANY } from "@/constants";
import { ONBOARDING_STORAGE_KEY } from "@/constants";
import { TourContext } from "./TourContext";
import { COMPANY_TOUR_STEPS, BUILDER_TOUR_STEPS } from "./TourTypes";
import { TourPanel } from "./TourPanel";

interface TourProviderProps {
  children: React.ReactNode;
  active: boolean;
}

const DISMISS_DURATION = 600;

export function TourProvider({ children, active }: TourProviderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isCompany = session?.user?.role === ROLE_COMPANY;
  const TOUR_STEPS = isCompany ? COMPANY_TOUR_STEPS : BUILDER_TOUR_STEPS;

  useEffect(() => {
    if (active && currentStep === 0) {
      setCurrentStep(1);
      saveTourState(1);
      router.push(TOUR_STEPS[0].route);
    }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isActive || isNavigating || dismissing) return;
    const expectedRoute = currentTourStep?.route;
    if (expectedRoute && pathname !== expectedRoute) {
      dismiss();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTourState = useCallback((step: number, completed: boolean = false) => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      const state = stored ? JSON.parse(stored) : {};
      state.tourCurrentStep = step;
      state.tourCompleted = completed;
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const isActive = active && currentStep > 0;
  const currentTourStep =
    currentStep > 0 && currentStep <= TOUR_STEPS.length
      ? TOUR_STEPS[currentStep - 1]
      : null;

  const dismiss = useCallback(() => {
    if (dismissing) return;
    setDismissing(true);
    clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      saveTourState(0, true);
      setCurrentStep(0);
      setDismissing(false);
    }, DISMISS_DURATION);
  }, [dismissing, saveTourState]);

  const goNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length) {
      const nextStep = TOUR_STEPS[currentStep];
      if (nextStep) {
        setIsNavigating(true);
        router.push(nextStep.route);
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
          saveTourState(currentStep + 1);
          setIsNavigating(false);
        }, 400);
      }
    } else {
      dismiss();
    }
  }, [currentStep, router, saveTourState, dismiss, TOUR_STEPS]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      const prevStep = TOUR_STEPS[currentStep - 2];
      if (prevStep) {
        setIsNavigating(true);
        router.push(prevStep.route);
        setTimeout(() => {
          setCurrentStep(currentStep - 1);
          saveTourState(currentStep - 1);
          setIsNavigating(false);
        }, 400);
      }
    }
  }, [currentStep, router, saveTourState, TOUR_STEPS]);

  const skipTour = useCallback(() => dismiss(), [dismiss]);

  const contextValue = {
    isActive: isActive && !dismissing,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    goNext,
    goBack,
    skipTour,
    currentTourStep,
  };

  const showOverlays = (isActive && currentTourStep) || dismissing;

  return (
    <TourContext.Provider value={contextValue}>
      {children}

      {showOverlays && (
        <>
          {/* Subtle overlay wash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: dismissing ? 0 : 1 }}
            transition={{ duration: dismissing ? 0.6 : 1, ease: "easeOut" }}
            className="fixed inset-0 z-[55] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 80% 95%, rgba(17, 17, 17, 0.04), transparent 60%)",
            }}
          />

          {/* Tour panel */}
          {currentTourStep && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{
                opacity: dismissing ? 0 : 1,
                y: dismissing ? 16 : 0,
              }}
              transition={{ duration: dismissing ? 0.5 : 0.3, ease: "easeOut" }}
              className="fixed bottom-8 right-8 z-[56] w-[360px]"
            >
              <TourPanel
                step={currentTourStep}
                stepNumber={currentStep}
                totalSteps={TOUR_STEPS.length}
              />
            </motion.div>
          )}
        </>
      )}
    </TourContext.Provider>
  );
}
