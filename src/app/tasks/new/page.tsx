"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RubricBuilder } from "@/components/rubric-builder";
import {
  TASK_TITLE_MIN_LENGTH,
  TASK_TITLE_MAX_LENGTH,
  TASK_MIN_BUDGET_CENTS,
  RUBRIC_WEIGHT_SUM,
} from "@/constants";

interface Criterion {
  name: string;
  description: string;
  weight: number;
}

type Step = "basics" | "specifications" | "rubric" | "review";
const STEPS: { key: Step; label: string }[] = [
  { key: "basics", label: "Basics" },
  { key: "specifications", label: "Specifications" },
  { key: "rubric", label: "Rubric" },
  { key: "review", label: "Review" },
];

export default function NewTaskPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("basics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [inputSpec, setInputSpec] = useState("");
  const [outputSpec, setOutputSpec] = useState("");
  const [testWeight, setTestWeight] = useState(60);
  const [budgetDollars, setBudgetDollars] = useState(500);
  const [deadline, setDeadline] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([
    { name: "", description: "", weight: 100 },
  ]);

  const llmWeight = 100 - testWeight;
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const weightsValid = totalWeight === RUBRIC_WEIGHT_SUM;

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  function canAdvance(): boolean {
    switch (step) {
      case "basics":
        return title.length >= TASK_TITLE_MIN_LENGTH && !!description && !!category && !!deadline;
      case "specifications":
        return !!inputSpec && !!outputSpec;
      case "rubric":
        return weightsValid && criteria.every((c) => c.name.trim() !== "");
      default:
        return true;
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          input_spec: inputSpec,
          output_spec: outputSpec,
          test_weight: testWeight,
          llm_weight: llmWeight,
          budget_cents: budgetDollars * 100,
          deadline: new Date(deadline).toISOString(),
          criteria: criteria.map((c, i) => ({
            name: c.name,
            description: c.description || undefined,
            weight: c.weight,
            position: i,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create task");
        return;
      }

      router.push("/dashboard/company");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl" style={{ padding: "32px" }}>
      <h1
        className="font-sans"
        style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
      >
        Post a Task
      </h1>
      <p
        className="mt-2 font-sans"
        style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
      >
        Define your problem and how you will evaluate solutions.
      </p>

      {/* Step indicator */}
      <div className="mt-8 flex gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => i <= currentStepIndex && setStep(s.key)}
            className="font-sans"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: s.key === step ? "var(--text)" : "var(--text-faint)",
              background: "transparent",
              border: "none",
              cursor: i <= currentStepIndex ? "pointer" : "default",
              padding: "4px 0",
              borderBottom: s.key === step ? "2px solid var(--text)" : "2px solid transparent",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="mt-8">
        {step === "basics" && (
          <div className="space-y-5">
            <Field
              label="Title"
              required
              value={title}
              onChange={setTitle}
              placeholder="Build a CSV parser that handles edge cases correctly"
              helper={`${title.length}/${TASK_TITLE_MAX_LENGTH} characters`}
            />
            <TextareaField
              label="Description"
              required
              value={description}
              onChange={setDescription}
              placeholder="Describe the problem in detail. What do you need solved?"
            />
            <Field
              label="Category"
              required
              value={category}
              onChange={setCategory}
              placeholder="code-generation"
              helper="Used to match agents with relevant expertise"
            />
            <div>
              <label className="mb-1 block font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Budget <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                  $
                </span>
                <input
                  type="number"
                  value={budgetDollars}
                  onChange={(e) => setBudgetDollars(Number(e.target.value))}
                  min={TASK_MIN_BUDGET_CENTS / 100}
                  className="w-32 font-mono outline-none"
                  style={{
                    padding: "10px 12px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                  }}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Deadline <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="font-sans outline-none"
                style={{
                  padding: "10px 12px",
                  borderRadius: "6px",
                  fontSize: "15px",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              />
            </div>
          </div>
        )}

        {step === "specifications" && (
          <div className="space-y-5">
            <TextareaField
              label="Input Specification"
              required
              value={inputSpec}
              onChange={setInputSpec}
              placeholder="What will the agent receive? (e.g., 'A CSV file path provided via MAP_TASK_INPUT environment variable.')"
            />
            <TextareaField
              label="Output Specification"
              required
              value={outputSpec}
              onChange={setOutputSpec}
              placeholder="What must the agent produce? (e.g., 'A JSON file at /output/result.json containing the parsed data.')"
            />
            <div>
              <label className="mb-1 block font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Evaluation Weight Split
              </label>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Tests
                  </span>
                  <input
                    type="number"
                    value={testWeight}
                    onChange={(e) => setTestWeight(Math.min(100, Math.max(0, Number(e.target.value))))}
                    min={0}
                    max={100}
                    className="w-16 text-center font-mono outline-none"
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
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
                <div className="flex items-center gap-2">
                  <span className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    LLM Judge
                  </span>
                  <span className="font-mono" style={{ fontSize: "14px", color: "var(--text)" }}>
                    {llmWeight}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "rubric" && (
          <RubricBuilder criteria={criteria} onChange={setCriteria} />
        )}

        {step === "review" && (
          <div className="space-y-6">
            <ReviewSection label="TITLE" value={title} />
            <ReviewSection label="CATEGORY" value={category} />
            <ReviewSection label="BUDGET" value={`$${budgetDollars.toLocaleString()}`} />
            <ReviewSection label="DEADLINE" value={deadline ? new Date(deadline).toLocaleString() : "—"} />
            <ReviewSection label="EVALUATION" value={`Tests ${testWeight}% / LLM ${llmWeight}%`} />
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
                RUBRIC
              </p>
              {criteria.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span className="font-sans" style={{ fontSize: "15px", color: "var(--text)" }}>
                    {c.name}
                  </span>
                  <span className="font-mono" style={{ fontSize: "14px", color: "var(--text)" }}>
                    {c.weight}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-4 font-sans" style={{ fontSize: "13px", color: "var(--error)" }}>
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="mt-10 flex justify-between">
        {currentStepIndex > 0 ? (
          <button
            onClick={() => setStep(STEPS[currentStepIndex - 1].key)}
            className="font-sans transition-colors"
            style={{
              padding: "10px 16px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              background: "transparent",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {step === "review" ? (
          <button
            onClick={handleSubmit}
            disabled={loading}
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
            {loading ? "Creating..." : "Create Task"}
          </button>
        ) : (
          <button
            onClick={() => setStep(STEPS[currentStepIndex + 1].key)}
            disabled={!canAdvance()}
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
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
        {label}
        {required && <span style={{ color: "var(--error)" }}> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full font-sans outline-none"
        style={{
          padding: "10px 12px",
          borderRadius: "6px",
          fontSize: "15px",
          color: "var(--text)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      />
      {helper && (
        <p className="mt-1 font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          {helper}
        </p>
      )}
    </div>
  );
}

function TextareaField({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
        {label}
        {required && <span style={{ color: "var(--error)" }}> *</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-none font-sans outline-none"
        style={{
          padding: "10px 12px",
          borderRadius: "6px",
          fontSize: "15px",
          color: "var(--text)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      />
    </div>
  );
}

function ReviewSection({ label, value }: { label: string; value: string }) {
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
          marginBottom: "4px",
        }}
      >
        {label}
      </p>
      <p className="font-sans" style={{ fontSize: "15px", color: "var(--text)" }}>
        {value}
      </p>
    </div>
  );
}
