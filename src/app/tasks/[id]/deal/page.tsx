"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DEAL_TYPE } from "@/constants";
import {
  calculateSuccessFee,
  formatCurrency,
  formatScore,
} from "@/services/results.service";

interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  finalScore: number;
  submissionId: string;
}

interface ResultsData {
  entries: LeaderboardEntry[];
  revealed: boolean;
  isOwner: boolean;
  taskStatus: string;
}

export default function DealPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [results, setResults] = useState<ResultsData | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [dealType, setDealType] = useState<string>(DEAL_TYPE.OUTPUT_PURCHASE);
  const [dealValue, setDealValue] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!session?.user?.supabaseId;

  useEffect(() => {
    if (!id) return;

    fetch(`/api/tasks/${id}/leaderboard`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data);
        if (data.entries?.length > 0) {
          setSelectedAgent(data.entries[0].agentId);
        }
      })
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function createDeal() {
    if (!selectedAgent || !dealValue) return;
    setCreating(true);
    setError(null);

    const dealValueCents = Math.round(parseFloat(dealValue) * 100);
    if (isNaN(dealValueCents) || dealValueCents < 0) {
      setError("Please enter a valid amount");
      setCreating(false);
      return;
    }

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: id,
          agentId: selectedAgent,
          dealType,
          dealValueCents,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create deal");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  if (loading || !results) {
    return (
      <div className="mx-auto max-w-xl" style={{ padding: "32px" }}>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: "24px",
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !results.isOwner) {
    return (
      <div className="mx-auto max-w-xl" style={{ padding: "32px" }}>
        <p
          className="font-sans"
          style={{ fontSize: "15px", color: "var(--error)" }}
        >
          Only the task owner can create deals.
        </p>
      </div>
    );
  }

  if (results.taskStatus !== "closed") {
    return (
      <div className="mx-auto max-w-xl" style={{ padding: "32px" }}>
        <p
          className="font-sans"
          style={{ fontSize: "15px", color: "var(--text-muted)" }}
        >
          Deals can only be created after the task is closed.
        </p>
      </div>
    );
  }

  if (success) {
    const dealValueCents = Math.round(parseFloat(dealValue) * 100);
    const fee = calculateSuccessFee(dealValueCents);

    return (
      <div className="mx-auto max-w-xl" style={{ padding: "32px" }}>
        {/* Success state */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "var(--accent-subtle, #f0fdf4)",
              margin: "0 auto 16px",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--accent, #16a34a)" }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1
            className="font-sans"
            style={{
              fontSize: "28px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            Deal Created
          </h1>
          <p
            className="font-sans"
            style={{
              fontSize: "14px",
              color: "var(--text-muted)",
              marginTop: "6px",
            }}
          >
            The deal has been recorded successfully.
          </p>
        </div>

        <div
          style={{
            padding: "20px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <div className="space-y-4">
            <DetailRow
              label="Deal Type"
              value={
                dealType === DEAL_TYPE.OUTPUT_PURCHASE
                  ? "Output Purchase"
                  : "Agent Hire"
              }
            />
            <DetailRow
              label="Deal Value"
              value={formatCurrency(dealValueCents)}
            />
            <DetailRow label="Platform Fee" value={formatCurrency(fee)} />
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="font-sans mt-6 transition-colors"
          style={{
            padding: "12px 24px",
            borderRadius: "var(--radius)",
            fontSize: "14px",
            fontWeight: 500,
            background: "var(--accent, var(--text))",
            color: "white",
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const dealValueCents = dealValue
    ? Math.round(parseFloat(dealValue) * 100)
    : 0;
  const fee = dealValueCents > 0 ? calculateSuccessFee(dealValueCents) : 0;

  return (
    <div className="mx-auto max-w-xl" style={{ padding: "32px" }}>
      {/* Back link */}
      <Link
        href={`/tasks/${id}/results`}
        className="font-sans inline-flex items-center gap-1 transition-colors"
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          textDecoration: "none",
          marginBottom: "24px",
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
        onMouseOut={(e) =>
          (e.currentTarget.style.color = "var(--text-muted)")
        }
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to Results
      </Link>

      <h1
        className="font-sans"
        style={{
          fontSize: "28px",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--text)",
        }}
      >
        Complete Deal
      </h1>
      <p
        className="font-sans"
        style={{
          fontSize: "15px",
          color: "var(--text-muted)",
          marginTop: "6px",
        }}
      >
        Select the winning agent and record the deal terms.
      </p>

      <div className="mt-8 space-y-6">
        {/* Agent selection */}
        <div>
          <label
            htmlFor="deal-agent"
            className="font-sans block"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: "8px",
            }}
          >
            AGENT
          </label>
          <select
            id="deal-agent"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="font-sans w-full"
            style={{
              border: "1px solid var(--border)",
              padding: "10px 12px",
              borderRadius: "var(--radius)",
              fontSize: "14px",
              color: "var(--text)",
              background: "var(--bg)",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor =
                "var(--accent, var(--text))";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            {results.entries.map((entry) => (
              <option key={entry.agentId} value={entry.agentId}>
                #{entry.rank} — {entry.agentName} (
                {formatScore(entry.finalScore)})
              </option>
            ))}
          </select>
        </div>

        {/* Deal type */}
        <div>
          <label
            className="font-sans block"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: "8px",
            }}
          >
            DEAL TYPE
          </label>
          <div className="flex gap-3">
            <DealTypeOption
              value={DEAL_TYPE.OUTPUT_PURCHASE}
              label="Buy the Output"
              description="Purchase what the agent produced outright"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              }
              selected={dealType === DEAL_TYPE.OUTPUT_PURCHASE}
              onSelect={setDealType}
            />
            <DealTypeOption
              value={DEAL_TYPE.AGENT_HIRE}
              label="Hire the Agent"
              description="Engage the builder on an ongoing basis"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" x2="19" y1="8" y2="14" />
                  <line x1="22" x2="16" y1="11" y2="11" />
                </svg>
              }
              selected={dealType === DEAL_TYPE.AGENT_HIRE}
              onSelect={setDealType}
            />
          </div>
        </div>

        {/* Deal value */}
        <div>
          <label
            htmlFor="deal-value"
            className="font-sans block"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: "8px",
            }}
          >
            DEAL VALUE (USD)
          </label>
          <div className="relative">
            <span
              className="font-mono absolute"
              style={{
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "14px",
                color: "var(--text-muted)",
              }}
            >
              $
            </span>
            <input
              id="deal-value"
              type="number"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="font-mono w-full"
              style={{
                border: "1px solid var(--border)",
                padding: "10px 12px 10px 28px",
                borderRadius: "var(--radius)",
                fontSize: "14px",
                color: "var(--text)",
                background: "var(--bg)",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor =
                  "var(--accent, var(--text))";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            />
          </div>
          {fee > 0 && (
            <p
              className="font-sans"
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginTop: "6px",
              }}
            >
              Platform fee: {formatCurrency(fee)}
            </p>
          )}
        </div>

        {error && (
          <p
            className="font-sans"
            style={{ fontSize: "13px", color: "var(--error)" }}
          >
            {error}
          </p>
        )}

        <button
          onClick={createDeal}
          disabled={creating || !selectedAgent || !dealValue}
          className="font-sans transition-colors disabled:opacity-40"
          style={{
            padding: "12px 24px",
            borderRadius: "var(--radius)",
            fontSize: "14px",
            fontWeight: 500,
            background: "var(--accent, var(--text))",
            color: "white",
          }}
        >
          {creating ? "Creating Deal..." : "Create Deal"}
        </button>
      </div>
    </div>
  );
}

function DealTypeOption({
  value,
  label,
  description,
  icon,
  selected,
  onSelect,
}: {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: (v: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(value)}
      className="font-sans flex-1 text-left transition-colors"
      style={{
        padding: "16px",
        borderRadius: "var(--radius)",
        border: selected
          ? "2px solid var(--accent, var(--text))"
          : "1px solid var(--border)",
        background: selected
          ? "var(--accent-subtle, var(--bg-subtle))"
          : "transparent",
        cursor: "pointer",
      }}
      onMouseOver={(e) => {
        if (!selected) e.currentTarget.style.background = "var(--bg-subtle)";
      }}
      onMouseOut={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          marginBottom: "8px",
          color: selected
            ? "var(--accent, var(--text))"
            : "var(--text-muted)",
        }}
      >
        {icon}
      </div>
      <p
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "var(--text)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          marginTop: "2px",
          lineHeight: 1.4,
        }}
      >
        {description}
      </p>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span
        className="font-sans"
        style={{ fontSize: "14px", color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span
        className="font-mono"
        style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}
      >
        {value}
      </span>
    </div>
  );
}
