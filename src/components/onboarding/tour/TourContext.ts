"use client";

import { createContext, useContext } from "react";
import type { TourStep } from "./TourTypes";

export interface TourContextValue {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  goNext: () => void;
  goBack: () => void;
  skipTour: () => void;
  currentTourStep: TourStep | null;
}

export const TourContext = createContext<TourContextValue>({
  isActive: false,
  currentStep: 0,
  totalSteps: 0,
  goNext: () => {},
  goBack: () => {},
  skipTour: () => {},
  currentTourStep: null,
});

export function useTour() {
  return useContext(TourContext);
}
