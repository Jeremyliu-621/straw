"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RubricBuilder } from "@/components/rubric-builder";
import {
  TextareaWithAttachments,
  type UploadedFile,
} from "@/components/file-upload-zone";
import { RefreshCw, Pencil, Check, Loader2 } from "lucide-react";
import {
  TASK_TITLE_MIN_LENGTH,
  TASK_TITLE_MAX_LENGTH,
  TASK_MIN_BUDGET_CENTS,
  RUBRIC_WEIGHT_SUM,
  CATEGORY_OPTIONS,
  EVAL_MODE,
  type EvalMode,
} from "@/constants";

interface Criterion {
  name: string;
  description: string;
  weight: number;
}

type Step = "basics" | "data" | "rubric" | "refine" | "review";
const STEPS: { key: Step; label: string }[] = [
  { key: "basics", label: "Basics" },
  { key: "data", label: "Data & Format" },
  { key: "rubric", label: "Rubric" },
  { key: "refine", label: "Refine" },
  { key: "review", label: "Review" },
];

export default function NewTaskPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("basics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basics
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [otherCategory, setOtherCategory] = useState("");
  const [budgetDollars, setBudgetDollars] = useState(500);
  const [deadline, setDeadline] = useState("");

  // Step 2: Data & Format
  const [inputFiles, setInputFiles] = useState<UploadedFile[]>([]);
  const [outputFiles, setOutputFiles] = useState<UploadedFile[]>([]);
  const [inputDescription, setInputDescription] = useState("");
  const [outputDescription, setOutputDescription] = useState("");
  const [testWeight, setTestWeight] = useState(60);
  const llmWeight = 100 - testWeight;
  const [testSuiteFile, setTestSuiteFile] = useState<File | null>(null);
  const [testSuiteError, setTestSuiteError] = useState<string | null>(null);
  const [evalMode, setEvalMode] = useState<EvalMode>(EVAL_MODE.LLM);
  const [evalImage, setEvalImage] = useState("");
  const [evalImageError, setEvalImageError] = useState<string | null>(null);
  const [evalNetwork, setEvalNetwork] = useState(false);
  const [evalMemoryMb, setEvalMemoryMb] = useState(1024);
  const [evalTimeoutSeconds, setEvalTimeoutSeconds] = useState(600);

  // Step 3: Rubric
  const [criteria, setCriteria] = useState<Criterion[]>([
    { name: "", description: "", weight: 100 },
  ]);
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const weightsValid = totalWeight === RUBRIC_WEIGHT_SUM;

  // Step 4: AI Refinement
  const [refinedDescription, setRefinedDescription] = useState("");
  const [refinedInputSpec, setRefinedInputSpec] = useState("");
  const [refinedOutputSpec, setRefinedOutputSpec] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [hasRefined, setHasRefined] = useState(false);

  // Step 5: Review — inline editing
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  function canAdvance(): boolean {
    switch (step) {
      case "basics": {
        const hasCategory =
          categories.length > 0 &&
          (!categories.includes("other") || otherCategory.trim() !== "");
        return (
          title.length >= TASK_TITLE_MIN_LENGTH &&
          !!description &&
          hasCategory &&
          !!deadline
        );
      }
      case "data":
        return !!(inputDescription || inputFiles.length > 0) &&
               !!(outputDescription || outputFiles.length > 0) &&
               (evalMode !== EVAL_MODE.LLM || testWeight === 0 || testSuiteFile !== null) &&
               (evalMode === EVAL_MODE.LLM || evalImage.trim() !== "");
      case "rubric":
        return weightsValid && criteria.every((c) => c.name.trim() !== "");
      case "refine":
        return hasRefined && !!refinedDescription && !!refinedInputSpec && !!refinedOutputSpec;
      default:
        return true;
    }
  }

  const handleRefine = useCallback(async () => {
    setIsRefining(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category: categories
            .map((c) => (c === "other" ? otherCategory.trim() : c))
            .join(", "),
          inputFiles: inputFiles.map((f) => ({
            name: f.file.name,
            description: f.description,
          })),
          outputFiles: outputFiles.map((f) => ({
            name: f.file.name,
            description: f.description,
          })),
          criteria: criteria.map((c) => ({
            name: c.name,
            description: c.description || undefined,
            weight: c.weight,
          })),
          testWeight,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Refinement failed");
        return;
      }
      const data = await res.json();
      setRefinedDescription(data.problemStatement);
      setRefinedInputSpec(data.inputSpec);
      setRefinedOutputSpec(data.outputSpec);
      setHasRefined(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsRefining(false);
    }
  }, [title, description, categories, otherCategory, inputFiles, outputFiles, criteria, testWeight]);

  function goToStep(target: Step) {
    setStep(target);
    // Auto-refine on first visit to refine step
    if (target === "refine" && !hasRefined && !isRefining) {
      handleRefine();
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      // Upload files to storage
      const uploadedInputUrls: string[] = [];
      const uploadedOutputUrls: string[] = [];

      for (const f of inputFiles) {
        const formData = new FormData();
        formData.append("file", f.file);
        const res = await fetch("/api/tasks/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          uploadedInputUrls.push(data.url);
        }
      }
      for (const f of outputFiles) {
        const formData = new FormData();
        formData.append("file", f.file);
        const res = await fetch("/api/tasks/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          uploadedOutputUrls.push(data.url);
        }
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: refinedDescription,
          category: categories
            .map((c) => (c === "other" ? otherCategory.trim() : c))
            .join(", "),
          input_spec: refinedInputSpec,
          output_spec: refinedOutputSpec,
          test_weight: evalMode === EVAL_MODE.LLM ? testWeight : 0,
          llm_weight: evalMode === EVAL_MODE.LLM ? llmWeight : 100,
          eval_mode: evalMode,
          eval_image: evalMode !== EVAL_MODE.LLM ? evalImage.trim() || null : null,
          eval_network: evalMode !== EVAL_MODE.LLM ? evalNetwork : false,
          eval_memory_mb: evalMode !== EVAL_MODE.LLM ? evalMemoryMb : 1024,
          eval_timeout_seconds: evalMode !== EVAL_MODE.LLM ? evalTimeoutSeconds : 600,
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

      const task = await res.json();

      // Upload test suite if provided
      if (testSuiteFile && testWeight > 0) {
        const suiteForm = new FormData();
        suiteForm.append("file", testSuiteFile);
        const suiteRes = await fetch(`/api/tasks/${task.id}/test-suite`, {
          method: "POST",
          body: suiteForm,
        });
        if (!suiteRes.ok) {
          const suiteData = await suiteRes.json();
          setError(suiteData.error ?? "Task created but failed to upload test suite");
          return;
        }
      }

      router.push("/dashboard/company");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FDFCFC",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Title row — full width */}
      <div style={{ width: "100%", borderBottom: "1px solid #e5e7eb" }}>
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            padding: "28px 40px 24px",
            borderLeft: "1px solid #e5e7eb",
            borderRight: "1px solid #e5e7eb",
          }}
        >
          <h1
            className="font-sans"
            style={{
              fontSize: "22px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            Post a Task
          </h1>
        </div>
      </div>

      {/* Middle: steps + content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid #e5e7eb",
            borderRight: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          {/* Step timeline row */}
          <div style={{ padding: "16px 40px 0", borderBottom: "1px solid #e5e7eb" }}>
          {/* Step timeline */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "0" }}>
            {STEPS.map((s, i) => {
              const isActive = s.key === step;
              const isPast = i < currentStepIndex;
              const isClickable = i <= currentStepIndex;
              return (
                <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
                  <button
                    onClick={() => isClickable && goToStep(s.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "transparent",
                      border: "none",
                      cursor: isClickable ? "pointer" : "default",
                      padding: "0 0 16px 0",
                      borderBottom: isActive
                        ? "2px solid var(--text)"
                        : "2px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: 600,
                        flexShrink: 0,
                        background: isActive
                          ? "var(--text)"
                          : isPast
                            ? "var(--text-faint)"
                            : "transparent",
                        border: isActive
                          ? "none"
                          : isPast
                            ? "none"
                            : "1.5px solid var(--border)",
                        color: isActive
                          ? "var(--inverse-text)"
                          : isPast
                            ? "var(--bg)"
                            : "var(--text-faint)",
                      }}
                    >
                      {isPast ? "\u2713" : i + 1}
                    </div>
                    <span
                      className="font-sans"
                      style={{
                        fontSize: "13px",
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? "var(--text)" : "var(--text-faint)",
                      }}
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        width: "32px",
                        height: "1px",
                        background:
                          i < currentStepIndex ? "var(--text-faint)" : "var(--border)",
                        margin: "0 6px",
                        marginBottom: "16px",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          </div>
          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px" }}>
          {/* ── Step 1: Basics ── */}
          {step === "basics" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label="Title"
                  required
                  value={title}
                  onChange={setTitle}
                  placeholder="Build a CSV parser that handles edge cases correctly"
                  helper={`${title.length}/${TASK_TITLE_MAX_LENGTH} characters${title.length < TASK_TITLE_MIN_LENGTH ? ` \u00b7 minimum ${TASK_TITLE_MIN_LENGTH}` : ""}`}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <TextareaField
                  label="Description"
                  required
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe the problem in detail. What do you need solved?"
                  rows={3}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <CategoryPicker
                  selected={categories}
                  onChange={setCategories}
                  otherValue={otherCategory}
                  onOtherChange={setOtherCategory}
                />
              </div>
              <div>
                <label
                  className="mb-1 block font-sans"
                  style={{ fontSize: "13px", color: "var(--text-muted)" }}
                >
                  Budget <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono"
                    style={{ fontSize: "14px", color: "var(--text-muted)" }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    value={budgetDollars}
                    onChange={(e) => setBudgetDollars(Number(e.target.value))}
                    min={TASK_MIN_BUDGET_CENTS / 100}
                    className="w-32 font-mono outline-none"
                    style={{
                      padding: "9px 12px",
                      borderRadius: "var(--radius)",
                      fontSize: "14px",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                    }}
                  />
                </div>
              </div>
              <div>
                <label
                  className="mb-1 block font-sans"
                  style={{ fontSize: "13px", color: "var(--text-muted)" }}
                >
                  Deadline <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="font-sans outline-none"
                  style={{
                    padding: "9px 12px",
                    borderRadius: "var(--radius)",
                    fontSize: "14px",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Data & Format ── */}
          {step === "data" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <p
                className="font-sans"
                style={{
                  fontSize: "14px",
                  lineHeight: 1.6,
                  color: "var(--text-muted)",
                  marginBottom: "4px",
                }}
              >
                Upload example files and describe what agents will receive and
                what they should produce. This helps us generate precise
                specifications.
              </p>

              {/* Input section */}
              <TextareaWithAttachments
                label="What will agents receive?"
                value={inputDescription}
                onChange={setInputDescription}
                placeholder="e.g. A CSV file with customer transaction data including columns: date, amount, category, merchant..."
                rows={3}
                files={inputFiles}
                onFilesChange={setInputFiles}
              />

              {/* Output section */}
              <TextareaWithAttachments
                label="What should agents produce?"
                value={outputDescription}
                onChange={setOutputDescription}
                placeholder="e.g. A JSON file at /output/result.json with categorized transactions and a summary report..."
                rows={3}
                files={outputFiles}
                onFilesChange={setOutputFiles}
              />

              {/* Eval weight split — only relevant for LLM mode (container mode ignores these weights) */}
              {evalMode === EVAL_MODE.LLM && <div>
                <label
                  className="mb-2 block font-sans"
                  style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}
                >
                  Evaluation Weight Split
                </label>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-sans"
                      style={{ fontSize: "13px", color: "var(--text-muted)" }}
                    >
                      Automated Tests
                    </span>
                    <input
                      type="number"
                      value={testWeight}
                      onChange={(e) => {
                        setTestWeight(
                          Math.min(100, Math.max(0, Number(e.target.value)))
                        );
                        // Reset test suite if weight goes to 0
                        if (Number(e.target.value) === 0) {
                          setTestSuiteFile(null);
                          setTestSuiteError(null);
                        }
                      }}
                      min={0}
                      max={100}
                      className="w-16 text-center font-mono outline-none"
                      style={{
                        padding: "6px 8px",
                        borderRadius: "var(--radius)",
                        fontSize: "14px",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                      }}
                    />
                    <span
                      className="font-mono"
                      style={{ fontSize: "14px", color: "var(--text-muted)" }}
                    >
                      %
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-sans"
                      style={{ fontSize: "13px", color: "var(--text-muted)" }}
                    >
                      LLM Judge
                    </span>
                    <span
                      className="font-mono"
                      style={{ fontSize: "14px", color: "var(--text)" }}
                    >
                      {llmWeight}%
                    </span>
                  </div>
                </div>
              </div>}

              {/* Evaluation Method */}
              <div>
                <label
                  className="mb-2 block font-sans"
                  style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}
                >
                  Evaluation Method
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {(
                    [
                      {
                        mode: EVAL_MODE.LLM,
                        title: "LLM Judge",
                        description: "Gemini scores your rubric criteria. Best for qualitative tasks.",
                      },
                      {
                        mode: EVAL_MODE.CONTAINER,
                        title: "Container Eval",
                        description: "Ship a Docker image that runs your own test suite.",
                      },
                      {
                        mode: EVAL_MODE.HYBRID,
                        title: "Hybrid",
                        description: "Container scores + LLM commentary. Best of both.",
                      },
                    ] as const
                  ).map(({ mode, title, description }) => {
                    const isActive = evalMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setEvalMode(mode);
                          setEvalImageError(null);
                        }}
                        className="font-sans text-left"
                        style={{
                          flex: "1 1 160px",
                          padding: "14px 16px",
                          borderRadius: "var(--radius)",
                          border: isActive
                            ? "1.5px solid var(--text)"
                            : "1px solid var(--border)",
                          background: isActive ? "var(--bg-subtle)" : "var(--bg)",
                          cursor: "pointer",
                          transition: "border-color 0.15s ease, background 0.15s ease",
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: isActive ? "var(--text)" : "var(--text-muted)",
                            marginBottom: "4px",
                          }}
                        >
                          {title}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "var(--text-faint)",
                            lineHeight: 1.5,
                          }}
                        >
                          {description}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Eval container image input */}
                {(evalMode === EVAL_MODE.CONTAINER || evalMode === EVAL_MODE.HYBRID) && (
                  <div style={{ marginTop: "14px" }}>
                    <label
                      className="mb-1 block font-sans"
                      style={{ fontSize: "13px", color: "var(--text-muted)" }}
                    >
                      Eval container image{" "}
                      <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={evalImage}
                      onChange={(e) => {
                        setEvalImage(e.target.value);
                        if (e.target.value.trim()) setEvalImageError(null);
                      }}
                      onBlur={async () => {
                        const trimmed = evalImage.trim();
                        if (!trimmed) {
                          setEvalImageError("Eval container image is required");
                          return;
                        }
                        try {
                          const res = await fetch("/api/tasks/validate-eval", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ eval_image: trimmed }),
                          });
                          const data = await res.json();
                          if (!data.valid) {
                            setEvalImageError(data.error ?? "Invalid image reference");
                          } else {
                            setEvalImageError(null);
                          }
                        } catch {
                          // Network error — don't block the user
                        }
                      }}
                      placeholder="myorg/eval:latest"
                      className="w-full font-mono outline-none"
                      style={{
                        padding: "9px 12px",
                        borderRadius: "var(--radius)",
                        fontSize: "13px",
                        color: "var(--text)",
                        border: evalImageError
                          ? "1px solid var(--error)"
                          : "1px solid var(--border)",
                        background: "var(--bg)",
                      }}
                    />
                    {evalImageError && (
                      <p
                        className="mt-1 font-sans"
                        style={{ fontSize: "12px", color: "var(--error)" }}
                      >
                        {evalImageError}
                      </p>
                    )}
                    {/* Mount contract info box */}
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "12px 14px",
                        borderRadius: "var(--radius)",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="font-sans"
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          lineHeight: 1.6,
                          marginBottom: "6px",
                        }}
                      >
                        <strong>Container contract:</strong> Your image will receive two mounts:
                      </p>
                      <ul
                        className="font-mono"
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          lineHeight: 1.8,
                          margin: 0,
                          paddingLeft: "16px",
                        }}
                      >
                        <li>/agent_output — read-only: the agent&apos;s output files</li>
                        <li>/results — writable: write score.json here</li>
                      </ul>
                      <p
                        className="font-sans"
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          lineHeight: 1.6,
                          marginTop: "6px",
                        }}
                      >
                        <code>score.json</code> must contain{" "}
                        <code>{`{"score": 0–100, "breakdown": {"criterion": score, ...}}`}</code>
                      </p>
                    </div>
                    {/* Eval container constraints */}
                    <div style={{ marginTop: "14px" }}>
                      <p
                        className="font-sans"
                        style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "8px" }}
                      >
                        Container constraints
                      </p>
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <label
                          className="font-sans flex items-center gap-2"
                          style={{ fontSize: "13px", color: "var(--text-muted)", cursor: "pointer" }}
                        >
                          <input
                            type="checkbox"
                            checked={evalNetwork}
                            onChange={(e) => setEvalNetwork(e.target.checked)}
                            style={{ accentColor: "var(--text)" }}
                          />
                          Allow network access
                        </label>
                        <label className="font-sans flex items-center gap-2" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                          Memory:
                          <select
                            value={evalMemoryMb}
                            onChange={(e) => setEvalMemoryMb(Number(e.target.value))}
                            className="font-mono"
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius)",
                              background: "var(--bg)",
                              color: "var(--text)",
                            }}
                          >
                            <option value={512}>512 MB</option>
                            <option value={1024}>1 GB</option>
                            <option value={2048}>2 GB</option>
                            <option value={4096}>4 GB</option>
                          </select>
                        </label>
                        <label className="font-sans flex items-center gap-2" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                          Timeout:
                          <select
                            value={evalTimeoutSeconds}
                            onChange={(e) => setEvalTimeoutSeconds(Number(e.target.value))}
                            className="font-mono"
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius)",
                              background: "var(--bg)",
                              color: "var(--text)",
                            }}
                          >
                            <option value={600}>10 min</option>
                            <option value={1800}>30 min</option>
                            <option value={3600}>1 hour</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Test suite upload — only for LLM mode when testWeight > 0 (container mode uses its own test harness) */}
              {evalMode === EVAL_MODE.LLM && testWeight > 0 && (
                <div>
                  <label
                    className="mb-1 block font-sans"
                    style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}
                  >
                    Test Suite{" "}
                    <span style={{ color: "var(--error)" }}>*</span>
                    <span
                      className="font-sans"
                      style={{ fontWeight: 400, marginLeft: "6px", color: "var(--text-faint)" }}
                    >
                      Required when automated test weight {">"} 0%
                    </span>
                  </label>
                  <p
                    className="font-sans"
                    style={{ fontSize: "12px", color: "var(--text-faint)", marginBottom: "8px", lineHeight: 1.5 }}
                  >
                    Upload a <code>.json</code> file with test cases. Format:{" "}
                    <code>{"{ \"test_cases\": [{ \"name\", \"input\", \"expected_output\", \"match_type\" }] }"}</code>
                    . Match types: <code>exact</code>, <code>contains</code>, <code>regex</code>.
                  </p>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <label
                      className="font-sans"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "8px 14px",
                        borderRadius: "var(--radius)",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        background: "var(--bg-subtle)",
                        cursor: "pointer",
                      }}
                    >
                      {testSuiteFile ? "Replace file" : "Choose file"}
                      <input
                        type="file"
                        accept=".json"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setTestSuiteError(null);
                          if (!f) return;
                          if (!f.name.endsWith(".json")) {
                            setTestSuiteError("File must be a .json file");
                            return;
                          }
                          if (f.size > 5 * 1024 * 1024) {
                            setTestSuiteError("File must be under 5MB");
                            return;
                          }
                          // Quick client-side JSON parse check
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            try {
                              const json = JSON.parse(ev.target?.result as string);
                              if (!Array.isArray(json?.test_cases) || json.test_cases.length === 0) {
                                setTestSuiteError("JSON must have a non-empty \"test_cases\" array");
                                return;
                              }
                              setTestSuiteFile(f);
                            } catch {
                              setTestSuiteError("File is not valid JSON");
                            }
                          };
                          reader.readAsText(f);
                        }}
                      />
                    </label>
                    {testSuiteFile && (
                      <span
                        className="font-sans"
                        style={{ fontSize: "13px", color: "var(--text-muted)" }}
                      >
                        {testSuiteFile.name}
                      </span>
                    )}
                    {testSuiteError && (
                      <span
                        className="font-sans"
                        style={{ fontSize: "12px", color: "var(--error)" }}
                      >
                        {testSuiteError}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Rubric ── */}
          {step === "rubric" && (
            <RubricBuilder criteria={criteria} onChange={setCriteria} />
          )}

          {/* ── Step 4: AI Refinement ── */}
          {step === "refine" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {isRefining ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "60px 20px",
                    gap: "16px",
                  }}
                >
                  <Loader2
                    size={24}
                    strokeWidth={1.5}
                    style={{ color: "var(--text-faint)", animation: "spin 1s linear infinite" }}
                  />
                  <p
                    className="font-sans"
                    style={{ fontSize: "14px", color: "var(--text-muted)" }}
                  >
                    Generating polished specifications from your inputs...
                  </p>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : hasRefined ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <p
                      className="font-sans"
                      style={{
                        fontSize: "14px",
                        lineHeight: 1.6,
                        color: "var(--text-muted)",
                      }}
                    >
                      Review and edit the AI-generated specifications below.
                      Regenerate if you want a fresh take.
                    </p>
                    <button
                      onClick={handleRefine}
                      className="font-sans flex items-center gap-2 transition-colors"
                      style={{
                        padding: "7px 14px",
                        borderRadius: "var(--radius)",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--text-muted)",
                        background: "transparent",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <RefreshCw size={14} strokeWidth={1.5} />
                      Regenerate
                    </button>
                  </div>

                  <RefinedField
                    label="Problem Statement"
                    value={refinedDescription}
                    onChange={setRefinedDescription}
                    rows={6}
                  />
                  <RefinedField
                    label="Input Specification"
                    value={refinedInputSpec}
                    onChange={setRefinedInputSpec}
                    rows={4}
                  />
                  <RefinedField
                    label="Output Specification"
                    value={refinedOutputSpec}
                    onChange={setRefinedOutputSpec}
                    rows={4}
                  />
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "60px 20px",
                    gap: "16px",
                  }}
                >
                  <p
                    className="font-sans"
                    style={{ fontSize: "14px", color: "var(--text-muted)" }}
                  >
                    Click below to generate polished specifications from your
                    inputs.
                  </p>
                  <button
                    onClick={handleRefine}
                    className="font-sans transition-colors"
                    style={{
                      padding: "10px 20px",
                      borderRadius: "var(--radius)",
                      fontSize: "14px",
                      fontWeight: 500,
                      background: "var(--text)",
                      color: "var(--inverse-text)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Generate Specifications
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 5: Review ── */}
          {step === "review" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p
                className="font-sans"
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginBottom: "4px",
                }}
              >
                Review your task before posting. Click any section to edit.
              </p>

              {/* Overview card */}
              <ReviewCard title="Overview">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <ReviewItem label="Title" value={title} />
                  <ReviewItem
                    label="Category"
                    value={categories
                      .map((c) =>
                        c === "other" ? otherCategory || "other" : c
                      )
                      .join(", ")}
                  />
                  <ReviewItem
                    label="Budget"
                    value={`$${budgetDollars.toLocaleString()}`}
                  />
                  <ReviewItem
                    label="Deadline"
                    value={
                      deadline
                        ? new Date(deadline).toLocaleString()
                        : "\u2014"
                    }
                  />
                  <ReviewItem
                    label="Evaluation"
                    value={`Tests ${testWeight}% / LLM ${llmWeight}%`}
                  />
                  <ReviewItem
                    label="Eval Method"
                    value={
                      evalMode === EVAL_MODE.LLM
                        ? "LLM Judge"
                        : evalMode === EVAL_MODE.CONTAINER
                          ? "Container Eval"
                          : "Hybrid"
                    }
                  />
                  {evalMode !== EVAL_MODE.LLM && evalImage && (
                    <ReviewItem label="Eval Image" value={evalImage} />
                  )}
                  {testWeight > 0 && testSuiteFile && (
                    <ReviewItem
                      label="Test Suite"
                      value={testSuiteFile.name}
                    />
                  )}
                </div>
                <EditSectionButton onClick={() => goToStep("basics")} />
              </ReviewCard>

              {/* Problem Statement card */}
              <ReviewCard title="Problem Statement">
                {editingSection === "description" ? (
                  <div>
                    <textarea
                      value={refinedDescription}
                      onChange={(e) => setRefinedDescription(e.target.value)}
                      rows={5}
                      className="w-full resize-none font-sans outline-none"
                      style={{
                        padding: "9px 12px",
                        borderRadius: "var(--radius)",
                        fontSize: "13px",
                        lineHeight: 1.6,
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                      }}
                    />
                    <button
                      onClick={() => setEditingSection(null)}
                      className="mt-2 font-sans flex items-center gap-1 transition-colors"
                      style={{
                        padding: "5px 10px",
                        borderRadius: "var(--radius)",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--inverse-text)",
                        background: "var(--text)",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <Check size={12} strokeWidth={2} />
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <p
                      className="font-sans"
                      style={{
                        fontSize: "13px",
                        lineHeight: 1.7,
                        color: "var(--text)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {refinedDescription}
                    </p>
                    <EditSectionButton
                      onClick={() => setEditingSection("description")}
                    />
                  </>
                )}
              </ReviewCard>

              {/* Specifications card */}
              <ReviewCard title="Specifications">
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <p
                      className="font-sans"
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase" as const,
                        color: "var(--text-faint)",
                        marginBottom: "4px",
                      }}
                    >
                      Input
                    </p>
                    <p
                      className="font-sans"
                      style={{
                        fontSize: "13px",
                        lineHeight: 1.6,
                        color: "var(--text)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {refinedInputSpec}
                    </p>
                  </div>
                  <div>
                    <p
                      className="font-sans"
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase" as const,
                        color: "var(--text-faint)",
                        marginBottom: "4px",
                      }}
                    >
                      Output
                    </p>
                    <p
                      className="font-sans"
                      style={{
                        fontSize: "13px",
                        lineHeight: 1.6,
                        color: "var(--text)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {refinedOutputSpec}
                    </p>
                  </div>
                </div>
                <EditSectionButton onClick={() => goToStep("refine")} />
              </ReviewCard>

              {/* Files card */}
              {(inputFiles.length > 0 || outputFiles.length > 0) && (
                <ReviewCard title="Attached Files">
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    {[...inputFiles, ...outputFiles].map((f, i) => (
                      <div
                        key={i}
                        className="font-sans"
                        style={{
                          padding: "6px 12px",
                          borderRadius: "var(--radius)",
                          fontSize: "12px",
                          color: "var(--text)",
                          background: "var(--bg-subtle)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {f.file.type.startsWith("image/") ? (
                          f.previewUrl ? (
                            <img
                              src={f.previewUrl}
                              alt=""
                              style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "var(--radius)",
                                objectFit: "cover",
                              }}
                            />
                          ) : null
                        ) : null}
                        {f.file.name}
                      </div>
                    ))}
                  </div>
                  <EditSectionButton onClick={() => goToStep("data")} />
                </ReviewCard>
              )}

              {/* Rubric card */}
              <ReviewCard title="Rubric">
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {criteria.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between"
                      style={{
                        padding: "10px 0",
                        borderBottom:
                          i < criteria.length - 1
                            ? "1px solid var(--border)"
                            : "none",
                      }}
                    >
                      <div>
                        <span
                          className="font-sans"
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--text)",
                          }}
                        >
                          {c.name}
                        </span>
                        {c.description && (
                          <p
                            className="font-sans"
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              marginTop: "2px",
                            }}
                          >
                            {c.description}
                          </p>
                        )}
                      </div>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--text)",
                          flexShrink: 0,
                        }}
                      >
                        {c.weight}%
                      </span>
                    </div>
                  ))}
                </div>
                <EditSectionButton onClick={() => goToStep("rubric")} />
              </ReviewCard>
            </div>
          )}
        </div>

        </div>
      </div>

      {/* Footer row — full width */}
      <div style={{ width: "100%", borderTop: "1px solid #e5e7eb" }}>
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            padding: "16px 40px",
            borderLeft: "1px solid #e5e7eb",
            borderRight: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {step === "basics" && (
              <button
                onClick={() => router.push("/dashboard/company")}
                className="font-sans transition-colors"
                style={{
                  padding: "9px 18px",
                  borderRadius: "var(--radius)",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: "transparent",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  width: "fit-content",
                }}
              >
                Exit
              </button>
            )}
            {error && (
              <p
                className="font-sans"
                style={{ fontSize: "13px", color: "var(--error)" }}
              >
                {error}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {currentStepIndex > 0 && (
              <button
                onClick={() => goToStep(STEPS[currentStepIndex - 1].key)}
                className="font-sans transition-colors"
                style={{
                  padding: "9px 18px",
                  borderRadius: "var(--radius)",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: "transparent",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            )}
            {step === "review" ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="font-sans transition-colors disabled:opacity-40"
                style={{
                  padding: "9px 18px",
                  borderRadius: "var(--radius)",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: "var(--text)",
                  color: "var(--inverse-text)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {loading ? "Creating..." : "Create Task"}
              </button>
            ) : (
              <button
                onClick={() => goToStep(STEPS[currentStepIndex + 1].key)}
                disabled={!canAdvance()}
                className="font-sans transition-colors disabled:opacity-40"
                style={{
                  padding: "9px 18px",
                  borderRadius: "var(--radius)",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: "var(--text)",
                  color: "var(--inverse-text)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper Components ─────────────────────────────────────── */

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
      <label
        className="mb-1 block font-sans"
        style={{ fontSize: "13px", color: "var(--text-muted)" }}
      >
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
          padding: "9px 12px",
          borderRadius: "var(--radius)",
          fontSize: "14px",
          color: "var(--text)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      />
      {helper && (
        <p
          className="mt-1 font-sans"
          style={{ fontSize: "12px", color: "var(--text-muted)" }}
        >
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
  rows = 4,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label
        className="mb-1 block font-sans"
        style={{ fontSize: "13px", color: "var(--text-muted)" }}
      >
        {label}
        {required && <span style={{ color: "var(--error)" }}> *</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none font-sans outline-none"
        style={{
          padding: "9px 12px",
          borderRadius: "var(--radius)",
          fontSize: "14px",
          color: "var(--text)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      />
    </div>
  );
}

function RefinedField({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label
        className="mb-1 block font-sans"
        style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}
      >
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full resize-y font-sans outline-none"
        style={{
          padding: "12px 14px",
          borderRadius: "var(--radius)",
          fontSize: "13px",
          lineHeight: 1.7,
          color: "var(--text)",
          border: "1px solid var(--border)",
          background: "var(--bg-subtle)",
        }}
      />
    </div>
  );
}

function CategoryPicker({
  selected,
  onChange,
  otherValue,
  onOtherChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  otherValue: string;
  onOtherChange: (v: string) => void;
}) {
  function toggle(cat: string) {
    if (selected.includes(cat)) {
      onChange(selected.filter((c) => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  }

  return (
    <div>
      <label
        className="mb-2 block font-sans"
        style={{ fontSize: "13px", color: "var(--text-muted)" }}
      >
        Category <span style={{ color: "var(--error)" }}>*</span>
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {CATEGORY_OPTIONS.map((cat) => {
          const active = selected.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              className="font-sans"
              style={{
                padding: "5px 12px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: active ? 500 : 400,
                border: `1px solid ${active ? "var(--text)" : "var(--border)"}`,
                background: active ? "var(--text)" : "transparent",
                color: active ? "var(--inverse-text)" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>
      {selected.includes("other") && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="Specify category..."
          className="mt-2 font-sans outline-none"
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius)",
            fontSize: "14px",
            color: "var(--text)",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            width: "220px",
          }}
        />
      )}
    </div>
  );
}

function ReviewCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        position: "relative",
      }}
    >
      <p
        className="font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-faint)",
          marginBottom: "12px",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="font-sans"
        style={{
          fontSize: "12px",
          color: "var(--text-faint)",
          marginBottom: "2px",
        }}
      >
        {label}
      </p>
      <p
        className="font-sans"
        style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}
      >
        {value}
      </p>
    </div>
  );
}

function EditSectionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-sans flex items-center gap-1 transition-colors"
      style={{
        position: "absolute",
        top: "16px",
        right: "16px",
        padding: "4px 10px",
        borderRadius: "var(--radius)",
        fontSize: "12px",
        fontWeight: 500,
        color: "var(--text-muted)",
        background: "transparent",
        border: "1px solid var(--border)",
        cursor: "pointer",
      }}
    >
      <Pencil size={11} strokeWidth={1.5} />
      Edit
    </button>
  );
}
