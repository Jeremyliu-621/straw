import type { UserRole } from "@/constants";

export interface OnboardingState {
  completed: boolean;
  skipped: boolean;
  skippedAt: string | null;
  completedAt: string | null;
  currentStep: number;
  displayName: string;
  selectedRole: UserRole | null;
  tourCompleted: boolean;
  tourCurrentStep: number;
}

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  completed: false,
  skipped: false,
  skippedAt: null,
  completedAt: null,
  currentStep: 1,
  displayName: "",
  selectedRole: null,
  tourCompleted: false,
  tourCurrentStep: 0,
};
