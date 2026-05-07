"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Handshake } from "lucide-react";
import { Section, EmptyState } from "@/components/dashboard/section";
import { relativeTime } from "@/components/dashboard/relative-time";

interface Deal {
  id: string;
  task_id: string;
  agent_id: string;
  deal_type: "output_purchase" | "agent_hire";
  deal_value_cents: number;
  platform_fee_cents: number;
  created_at: string;
}

interface DealsResponse {
  data?: Deal[];
}

/**
 * /dashboard/company/deals — list of every deal the company has
 * created. Backed by GET /api/v1/deals (paginated, but the company's
 * deals are typically small N — single-page render is fine for v1).
 */
export default function CompanyDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/deals?limit=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DealsResponse | null) => {
        setDeals(Array.isArray(data?.data) ? (data.data as Deal[]) : []);
      })
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  const totalValue = deals.reduce((acc, d) => acc + d.deal_value_cents, 0);
  const totalFees = deals.reduce((acc, d) => acc + d.platform_fee_cents, 0);

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "24px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "20px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            className="font-sans"
            style={{
              fontSize: "26px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            Deals
          </h1>
          <p
            className="mt-2 font-sans"
            style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
          >
            Hires and output purchases with winning agents.
          </p>
        </div>
        {!loading && deals.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              flexShrink: 0,
            }}
          >
            <HeaderStat label="Deals" value={deals.length.toString()} />
            <HeaderStat
              label="Total value"
              value={`$${(totalValue / 100).toLocaleString()}`}
              mono
            />
            <HeaderStat
              label="Platform fees"
              value={`$${(totalFees / 100).toLocaleString()}`}
              mono
            />
          </div>
        )}
      </div>

      <Section label="All deals" count={!loading ? deals.length : undefined}>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  height: "56px",
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--radius)",
                }}
              />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <EmptyState
            icon={<Handshake size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
            title="No deals yet"
            body="When you close a task and hire or purchase from a winning agent, the deal lands here."
          />
        ) : (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}
          >
            {deals.map((d) => (
              <DealRow key={d.id} deal={d} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function DealRow({ deal }: { deal: Deal }) {
  const dealTypeLabel =
    deal.deal_type === "agent_hire" ? "Hire" : "Output purchase";
  return (
    <Link
      href={`/tasks/${deal.task_id}`}
      className="flex items-center"
      style={{
        gap: "16px",
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        textDecoration: "none",
        color: "var(--text)",
        transition: "background-color 0.12s ease",
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="font-sans"
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {dealTypeLabel}
        </div>
        <div
          className="font-sans"
          style={{
            marginTop: "2px",
            fontSize: "12px",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span className="font-mono">{deal.task_id.slice(0, 8)}</span>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <span>agent {deal.agent_id.slice(0, 8)}</span>
        </div>
      </div>
      <div
        className="font-mono"
        style={{
          fontSize: "14px",
          color: "var(--text)",
          fontVariantNumeric: "tabular-nums" as const,
          flexShrink: 0,
          textAlign: "right",
        }}
      >
        ${(deal.deal_value_cents / 100).toLocaleString()}
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-faint)",
            marginTop: "2px",
          }}
        >
          fee ${(deal.platform_fee_cents / 100).toLocaleString()}
        </div>
      </div>
      <span
        className="font-sans"
        style={{
          fontSize: "12px",
          color: "var(--text-faint)",
          flexShrink: 0,
          width: "85px",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums" as const,
        }}
        title={new Date(deal.created_at).toLocaleString()}
      >
        {relativeTime(deal.created_at)}
      </span>
    </Link>
  );
}

function HeaderStat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ minWidth: "60px" }}>
      <p
        className="font-sans"
        style={{
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-faint)",
          margin: 0,
          marginBottom: "2px",
        }}
      >
        {label}
      </p>
      <p
        className={mono ? "font-mono" : "font-sans"}
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "var(--text)",
          letterSpacing: "-0.01em",
          fontVariantNumeric: mono ? ("tabular-nums" as const) : undefined,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}
