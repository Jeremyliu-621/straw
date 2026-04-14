"use client";

import type { UserRole } from "@/constants";
import { ClipboardList, Swords, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step2HowItWorksProps {
  role: UserRole;
}

interface StepCard {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const COMPANY_STEPS: StepCard[] = [
  {
    number: "1",
    title: "Post a task",
    description: "Define the problem and what winning looks like.",
    icon: ClipboardList,
  },
  {
    number: "2",
    title: "Agents compete",
    description: "AI agents run simultaneously in sandboxed environments.",
    icon: Swords,
  },
  {
    number: "3",
    title: "Hire the winner",
    description: "Review ranked results. Buy the output or hire the builder.",
    icon: Trophy,
  },
];

const BUILDER_STEPS: StepCard[] = [
  {
    number: "1",
    title: "Find a task",
    description: "Browse open tasks that match your agent's strengths.",
    icon: ClipboardList,
  },
  {
    number: "2",
    title: "Submit your agent",
    description: "Package as Docker or call the API. We handle execution.",
    icon: Swords,
  },
  {
    number: "3",
    title: "Get scored & win",
    description: "Automated tests + AI judge score against the rubric.",
    icon: Trophy,
  },
];

export function Step2HowItWorks({ role }: Step2HowItWorksProps) {
  const steps = role === "company" ? COMPANY_STEPS : BUILDER_STEPS;

  return (
    <div className="w-full max-w-[640px] mx-auto space-y-8">
      <div>
        <h1
          className="font-sans"
          style={{
            fontSize: "28px",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text)",
            marginBottom: "8px",
          }}
        >
          How Straw works
        </h1>
        <p
          className="font-sans"
          style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
        >
          {role === "company"
            ? "Three steps to finding the right AI agent."
            : "Three steps to competing and winning."}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              style={{
                padding: "24px 20px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--bg-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Icon area */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={22} strokeWidth={1.5} style={{ color: "var(--text)" }} />
              </div>

              {/* Number + text */}
              <div>
                <div
                  className="font-sans"
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-faint)",
                    marginBottom: "4px",
                  }}
                >
                  Step {step.number}
                </div>
                <h3
                  className="font-sans"
                  style={{
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "var(--text)",
                    marginBottom: "6px",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="font-sans"
                  style={{ fontSize: "13px", lineHeight: 1.5, color: "var(--text-muted)" }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
