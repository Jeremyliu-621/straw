"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useTour } from "./TourContext";
import type { TourStep } from "./TourTypes";
import { Button } from "@/components/ui/button";

interface TourPanelProps {
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
}

export function TourPanel({ step, stepNumber, totalSteps }: TourPanelProps) {
  const { goNext, goBack, skipTour } = useTour();
  const progressPercent = (stepNumber / totalSteps) * 100;

  return (
    <div
      style={{
        background: "var(--bg)",
        border: "1px solid rgba(200, 195, 188, 0.5)",
        borderRadius: "var(--radius)",
        boxShadow: [
          "0 0 0 1px rgba(253, 252, 252, 0.6)",
          "0 0 15px rgba(253, 252, 252, 0.4)",
          "0 0 40px rgba(245, 240, 235, 0.3)",
          "0 0 80px rgba(240, 235, 228, 0.15)",
          "0 8px 32px rgba(0, 0, 0, 0.06)",
        ].join(", "),
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Progress bar at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: "var(--border)",
          borderRadius: "var(--radius) var(--radius) 0 0",
          overflow: "hidden",
        }}
      >
        <motion.div
          style={{ height: "100%", background: "var(--text)" }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Step counter */}
      <p
        className="font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          textTransform: "uppercase" as const,
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          marginBottom: "8px",
        }}
      >
        Step {stepNumber} of {totalSteps}
      </p>

      {/* Title */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`title-${step.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h3
            className="font-sans"
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "8px",
            }}
          >
            {step.panelTitle}
          </h3>
        </motion.div>
      </AnimatePresence>

      {/* Description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`desc-${step.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p
            className="font-sans"
            style={{
              fontSize: "14px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              marginBottom: "20px",
            }}
          >
            {step.panelDescription}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Footer controls */}
      <div
        className="flex items-center justify-between"
        style={{ paddingTop: "16px", borderTop: "1px solid var(--border)" }}
      >
        {stepNumber > 1 ? (
          <button
            onClick={goBack}
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
        ) : (
          <div />
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={skipTour}
            className="font-sans transition-colors"
            style={{
              fontSize: "12px",
              color: "var(--text-faint)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Skip tour
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={goNext}
            trailingIcon={stepNumber < totalSteps ? <ChevronRight size={14} /> : undefined}
          >
            {step.nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
