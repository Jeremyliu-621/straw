"use client";

interface Step1WelcomeProps {
  displayName: string;
  onDisplayNameChange: (name: string) => void;
}

export function Step1Welcome({ displayName, onDisplayNameChange }: Step1WelcomeProps) {
  return (
    <div className="w-full max-w-[480px] mx-auto space-y-6">
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
          Welcome to Straw.
        </h1>
        <p
          className="font-sans"
          style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
        >
          What should we call you? This is how you&apos;ll appear on the platform.
        </p>
      </div>

      <div>
        <label
          htmlFor="onboarding-display-name"
          className="mb-1 block font-sans"
          style={{ fontSize: "13px", color: "var(--text-muted)" }}
        >
          Display Name
        </label>
        <input
          id="onboarding-display-name"
          type="text"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="Your name or handle"
          autoFocus
          className="w-full font-sans outline-none"
          style={{
            padding: "9px 12px",
            borderRadius: "var(--radius)",
            fontSize: "14px",
            color: "var(--text)",
            border: "1px solid var(--border)",
            background: "var(--bg)",
          }}
        />
        <p
          className="mt-2 font-sans"
          style={{ fontSize: "13px", color: "var(--text-faint)" }}
        >
          You can change this later in your profile.
        </p>
      </div>
    </div>
  );
}
