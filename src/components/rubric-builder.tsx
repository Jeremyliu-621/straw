"use client";

import { Plus, X } from "lucide-react";
import { RUBRIC_MAX_CRITERIA, RUBRIC_WEIGHT_SUM } from "@/constants";

interface Criterion {
  name: string;
  description: string;
  weight: number;
}

interface RubricBuilderProps {
  criteria: Criterion[];
  onChange: (criteria: Criterion[]) => void;
}

export function RubricBuilder({ criteria, onChange }: RubricBuilderProps) {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const weightsValid = totalWeight === RUBRIC_WEIGHT_SUM;
  const canAdd = criteria.length < RUBRIC_MAX_CRITERIA;

  function updateCriterion(index: number, updates: Partial<Criterion>) {
    const updated = criteria.map((c, i) => (i === index ? { ...c, ...updates } : c));
    onChange(updated);
  }

  function removeCriterion(index: number) {
    if (criteria.length <= 1) return;
    onChange(criteria.filter((_, i) => i !== index));
  }

  function addCriterion() {
    if (!canAdd) return;
    onChange([...criteria, { name: "", description: "", weight: 0 }]);
  }

  return (
    <div>
      <p
        className="font-sans"
        style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)", marginBottom: "24px" }}
      >
        Define what good output looks like. Each criterion gets a weight — they must sum to 100%.
        The LLM judge scores each dimension independently.
      </p>

      <div className="space-y-4">
        {criteria.map((criterion, index) => (
          <div
            key={index}
            style={{
              padding: "16px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={criterion.name}
                    onChange={(e) => updateCriterion(index, { name: e.target.value })}
                    placeholder="Criterion name (e.g., Correctness)"
                    className="flex-1 font-sans outline-none"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius)",
                      fontSize: "15px",
                      fontWeight: 500,
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                    }}
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={criterion.weight}
                      onChange={(e) =>
                        updateCriterion(index, {
                          weight: Math.max(0, Math.min(100, Number(e.target.value))),
                        })
                      }
                      min={0}
                      max={100}
                      className="w-16 text-right font-mono outline-none"
                      style={{
                        padding: "8px 8px",
                        borderRadius: "var(--radius)",
                        fontSize: "14px",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                      }}
                    />
                    <span className="font-mono" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                      %
                    </span>
                  </div>
                </div>
                <textarea
                  value={criterion.description}
                  onChange={(e) => updateCriterion(index, { description: e.target.value })}
                  placeholder="What does the judge look for? (optional)"
                  rows={2}
                  className="w-full resize-none font-sans outline-none"
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius)",
                    fontSize: "13px",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                  }}
                />
              </div>
              {criteria.length > 1 && (
                <button
                  onClick={() => removeCriterion(index)}
                  className="mt-2 transition-colors"
                  style={{
                    color: "var(--text-faint)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                  title="Remove criterion"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add criterion */}
      {canAdd && (
        <button
          onClick={addCriterion}
          className="mt-3 flex items-center gap-1 font-sans transition-colors"
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius)",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text-muted)",
            background: "transparent",
            border: "1px dashed var(--border)",
            cursor: "pointer",
          }}
        >
          <Plus size={14} strokeWidth={1.5} />
          Add criterion
        </button>
      )}

      {/* Weight total — always visible, persistent validation */}
      <p
        className="mt-4 font-sans"
        style={{
          fontSize: "13px",
          color: weightsValid ? "var(--text-muted)" : "var(--error)",
        }}
      >
        Total: {totalWeight}%{" "}
        {!weightsValid && "— must equal 100%"}
      </p>
    </div>
  );
}
