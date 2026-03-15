"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ROLE_COMPANY, DEAL_TYPE } from "@/constants";
import { calculateSuccessFee, formatCurrency, formatScore } from "@/services/results.service";

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

  const isCompany = session?.user?.role === ROLE_COMPANY;

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
              style={{ height: "24px", background: "var(--bg-subtle)", borderRadius: "6px" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isCompany || !results.isOwner) {
    return (
      <div className="mx-auto max-w-xl" style={{ padding: "32px" }}>
        <p className="font-sans" style={{ fontSize: "15px", color: "var(--error)" }}>
          Only the task owner can create deals.
        </p>
      </div>
    );
  }

  if (results.taskStatus !== "closed") {
    return (
      <div className="mx-auto max-w-xl" style={{ padding: "32px" }}>
        <p className="font-sans" style={{ fontSize: "15px", color: "var(--text-muted)" }}>
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
        <h1
          className="font-sans"
          style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
        >
          Deal Created
        </h1>
        <div
          style={{
            marginTop: "24px",
            padding: "24px",
            border: "1px solid var(--border)",
            borderRadius: "6px",
          }}
        >
          <div className="space-y-4">
            <DetailRow label="Deal Type" value={dealType === DEAL_TYPE.OUTPUT_PURCHASE ? "Output Purchase" : "Agent Hire"} />
            <DetailRow label="Deal Value" value={formatCurrency(dealValueCents)} />
            <DetailRow label="Platform Fee" value={formatCurrency(fee)} />
          </div>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="font-sans mt-6 transition-colors"
          style={{
            padding: "10px 16px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            background: "var(--text)",
            color: "var(--inverse-text)",
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const dealValueCents = dealValue ? Math.round(parseFloat(dealValue) * 100) : 0;
  const fee = dealValueCents > 0 ? calculateSuccessFee(dealValueCents) : 0;

  return (
    <div className="mx-auto max-w-xl" style={{ padding: "32px" }}>
      <h1
        className="font-sans"
        style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
      >
        Complete Deal
      </h1>
      <p className="font-sans" style={{ fontSize: "15px", color: "var(--text-muted)", marginTop: "8px" }}>
        Select the winning agent and record the deal terms.
      </p>

      <div className="mt-8 space-y-6">
        {/* Agent selection */}
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
            AGENT
          </label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="font-sans w-full"
            style={{
              border: "1px solid var(--border)",
              padding: "10px 12px",
              borderRadius: "6px",
              fontSize: "15px",
              color: "var(--text)",
              background: "var(--bg)",
            }}
          >
            {results.entries.map((entry) => (
              <option key={entry.agentId} value={entry.agentId}>
                #{entry.rank} — {entry.agentName} ({formatScore(entry.finalScore)})
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
          <div className="flex gap-4">
            <DealTypeOption
              value={DEAL_TYPE.OUTPUT_PURCHASE}
              label="Buy the Output"
              description="Purchase what the agent produced outright"
              selected={dealType === DEAL_TYPE.OUTPUT_PURCHASE}
              onSelect={setDealType}
            />
            <DealTypeOption
              value={DEAL_TYPE.AGENT_HIRE}
              label="Hire the Agent"
              description="Engage the builder on an ongoing basis"
              selected={dealType === DEAL_TYPE.AGENT_HIRE}
              onSelect={setDealType}
            />
          </div>
        </div>

        {/* Deal value */}
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
            DEAL VALUE (USD)
          </label>
          <div className="relative">
            <span
              className="font-mono absolute"
              style={{
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "15px",
                color: "var(--text-muted)",
              }}
            >
              $
            </span>
            <input
              type="number"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="font-mono w-full"
              style={{
                border: "1px solid var(--border)",
                padding: "10px 12px 10px 24px",
                borderRadius: "6px",
                fontSize: "15px",
                color: "var(--text)",
                background: "var(--bg)",
                outline: "none",
              }}
            />
          </div>
          {fee > 0 && (
            <p className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
              Platform fee: {formatCurrency(fee)}
            </p>
          )}
        </div>

        {error && (
          <p className="font-sans" style={{ fontSize: "13px", color: "var(--error)" }}>
            {error}
          </p>
        )}

        <button
          onClick={createDeal}
          disabled={creating || !selectedAgent || !dealValue}
          className="font-sans transition-colors disabled:opacity-40"
          style={{
            padding: "10px 16px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            background: "var(--text)",
            color: "var(--inverse-text)",
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
  selected,
  onSelect,
}: {
  value: string;
  label: string;
  description: string;
  selected: boolean;
  onSelect: (v: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(value)}
      className="font-sans flex-1 text-left transition-colors"
      style={{
        padding: "12px 16px",
        borderRadius: "6px",
        border: `1px solid ${selected ? "var(--text)" : "var(--border)"}`,
        background: selected ? "var(--bg-subtle)" : "transparent",
        cursor: "pointer",
      }}
    >
      <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}>{label}</p>
      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>{description}</p>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="font-sans" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="font-mono" style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}
