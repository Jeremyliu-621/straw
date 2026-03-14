"use client";

import { useEffect, useState } from "react";

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calculateTimeRemaining(deadline: string): TimeRemaining {
  const diff = new Date(deadline).getTime() - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

export function DeadlineCountdown({
  deadline,
  onExpired,
}: {
  deadline: string;
  onExpired?: () => void;
}) {
  const [time, setTime] = useState<TimeRemaining>(() => calculateTimeRemaining(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(deadline);
      setTime(remaining);

      if (remaining.expired) {
        clearInterval(timer);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, onExpired]);

  if (time.expired) {
    return (
      <div>
        <p
          className="font-sans"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-muted)",
            marginBottom: "8px",
          }}
        >
          DEADLINE
        </p>
        <p className="font-sans" style={{ fontSize: "15px", color: "var(--text-muted)" }}>
          Deadline passed
        </p>
      </div>
    );
  }

  return (
    <div>
      <p
        className="font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-muted)",
          marginBottom: "8px",
        }}
      >
        TIME REMAINING
      </p>
      <div className="flex gap-6">
        <TimeUnit value={time.days} label="days" />
        <TimeUnit value={time.hours} label="hrs" />
        <TimeUnit value={time.minutes} label="min" />
        <TimeUnit value={time.seconds} label="sec" />
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <span
        className="font-mono"
        style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "var(--text)",
          display: "block",
          minWidth: "48px",
        }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span
        className="font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
