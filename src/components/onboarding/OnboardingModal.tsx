"use client";

import { motion, AnimatePresence } from "framer-motion";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  backVisible: boolean;
  skipVisible: boolean;
  children: React.ReactNode;
}

export function OnboardingModal({
  isOpen,
  onClose,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  nextLabel,
  nextDisabled,
  backVisible,
  skipVisible,
  children,
}: OnboardingModalProps) {
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(17, 17, 17, 0.35)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed z-[61] rounded-[24px] flex flex-col"
            style={{
              top: "44px",
              left: "44px",
              right: "44px",
              bottom: "44px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.12)",
            }}
          >
            {/* Top bar: Logo + Progress */}
            <div
              className="flex items-center justify-between shrink-0"
              style={{ padding: "28px 36px 0" }}
            >
              <div className="flex items-center gap-2">
                <img
                  src="/strawlonglogo.png"
                  alt="Straw"
                  className="h-5 w-auto"
                />
              </div>

              <div
                className="overflow-hidden rounded-full"
                style={{
                  width: "160px",
                  height: "2px",
                  background: "var(--border)",
                }}
              >
                <motion.div
                  style={{ height: "100%", background: "var(--text)" }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto">
              <div className="min-h-full flex items-center justify-center py-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom bar */}
            <div
              className="flex items-center justify-between shrink-0"
              style={{
                padding: "20px 36px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div>
                {backVisible && (
                  <button
                    onClick={onBack}
                    className="font-sans transition-colors"
                    style={{
                      fontSize: "13px",
                      color: "var(--text-muted)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    &larr; Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                {skipVisible && (
                  <button
                    onClick={onSkip}
                    className="font-sans transition-colors"
                    style={{
                      fontSize: "13px",
                      color: "var(--text-faint)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Skip for now
                  </button>
                )}
                <button
                  onClick={onNext}
                  disabled={nextDisabled}
                  className="font-sans transition-colors disabled:opacity-40"
                  style={{
                    padding: "10px 24px",
                    borderRadius: "var(--radius)",
                    fontSize: "14px",
                    fontWeight: 500,
                    background: "var(--text)",
                    color: "var(--inverse-text)",
                    border: "none",
                    cursor: nextDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  {nextLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
