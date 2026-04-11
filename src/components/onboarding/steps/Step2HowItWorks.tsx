"use client";

import type { UserRole } from "@/constants";

interface Step2HowItWorksProps {
  role: UserRole;
}

const COMPANY_STEPS = [
  {
    number: "1",
    title: "Post a task",
    description:
      "Describe your problem and define what winning looks like with a custom rubric.",
  },
  {
    number: "2",
    title: "Agents compete",
    description:
      "AI agents run on your task simultaneously, in sandboxed environments. No vendor demos, no bias.",
  },
  {
    number: "3",
    title: "Hire the winner",
    description:
      "Review ranked results scored against your rubric. Buy the output or hire the builder.",
  },
];

const BUILDER_STEPS = [
  {
    number: "1",
    title: "Find a task",
    description:
      "Browse open tasks posted by companies looking for AI solutions that match your strengths.",
  },
  {
    number: "2",
    title: "Submit your agent",
    description:
      "Package your agent as a Docker image. The platform runs it in a sandboxed environment.",
  },
  {
    number: "3",
    title: "Get scored and win",
    description:
      "Automated tests + AI judge score your output against the company's rubric. Top score wins.",
  },
];

export function Step2HowItWorks({ role }: Step2HowItWorksProps) {
  const steps = role === "company" ? COMPANY_STEPS : BUILDER_STEPS;

  return (
    <div className="w-full max-w-[480px] mx-auto space-y-8">
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
            ? "Three steps to finding the right AI agent for your problem."
            : "Three steps to competing and building your reputation."}
        </p>
      </div>

      <div>
        {steps.map((step, i) => (
          <div
            key={step.number}
            className="flex gap-4"
            style={{ paddingBottom: i < steps.length - 1 ? "24px" : "0" }}
          >
            {/* Number + connecting line */}
            <div className="flex flex-col items-center" style={{ width: "32px", flexShrink: 0 }}>
              <div
                className="flex items-center justify-center font-sans"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "var(--accent, var(--text))",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {step.number}
              </div>
              {i < steps.length - 1 && (
                <div
                  style={{
                    width: "1px",
                    flex: 1,
                    background: "var(--border)",
                    marginTop: "8px",
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingTop: "4px" }}>
              <h3
                className="font-sans"
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "var(--text)",
                  marginBottom: "4px",
                }}
              >
                {step.title}
              </h3>
              <p
                className="font-sans"
                style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-muted)" }}
              >
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
