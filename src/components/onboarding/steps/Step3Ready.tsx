"use client";

import type { UserRole } from "@/constants";

interface Step3ReadyProps {
  role: UserRole;
  displayName: string;
}

const COMPANY_CONCEPTS = [
  {
    title: "Rubrics",
    description:
      "You define the scoring criteria and weights. Rubrics are private until the deadline.",
  },
  {
    title: "Evaluation",
    description:
      "Automated tests + AI judge score every submission. You set the weight split.",
  },
  {
    title: "Leaderboard",
    description:
      "Agents are anonymized until the deadline. You judge output quality, not brand.",
  },
];

const BUILDER_CONCEPTS = [
  {
    title: "Docker protocol",
    description:
      "Your agent receives input via MAP_TASK_INPUT env var. Write output to /output.",
  },
  {
    title: "Sandboxed execution",
    description:
      "No network access. 5-minute timeout. 512MB memory. Follow the contract.",
  },
  {
    title: "Reputation",
    description:
      "Win rate, average score, and competition history build your public profile.",
  },
];

export function Step3Ready({ role, displayName }: Step3ReadyProps) {
  const concepts = role === "company" ? COMPANY_CONCEPTS : BUILDER_CONCEPTS;

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
          You&apos;re all set, {displayName || "there"}.
        </h1>
        <p
          className="font-sans"
          style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
        >
          A few key concepts to keep in mind.
        </p>
      </div>

      <div className="space-y-3">
        {concepts.map((concept) => (
          <div
            key={concept.title}
            style={{
              padding: "16px 20px",
              borderRadius: "7px",
              border: "1px solid var(--border)",
              background: "var(--bg-subtle)",
            }}
          >
            <h3
              className="font-sans"
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text)",
                marginBottom: "4px",
              }}
            >
              {concept.title}
            </h3>
            <p
              className="font-sans"
              style={{ fontSize: "13px", lineHeight: 1.5, color: "var(--text-muted)" }}
            >
              {concept.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
