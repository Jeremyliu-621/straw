/**
 * Multi-Pass LLM Evaluation
 *
 * Three targeted LLM passes instead of one truncated dump:
 *
 * Pass 1 — Thesis Review:  reads the agent's docs (SUBMISSION.md, ARCHITECTURE.md, etc.)
 *                           extracts file references for Pass 2
 * Pass 2 — Code Audit:     reads referenced code files, cross-checks against claims
 * Pass 3 — Synthesis:      maps thesis + audit onto rubric criteria (no code re-reading)
 *
 * Activated only for tasks with a submission_contract. Tasks without contracts
 * use the existing single-pass evaluator (unchanged).
 *
 * If any pass fails after retries, returns null — the caller falls back to single-pass.
 */

import { z } from "zod/v4";
import type { SubmissionContract } from "@/lib/submission-contract";

// ── Types ──────────────────────────────────────────────────

export interface FileIndexEntry {
  name: string;
  sizeBytes: number;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string | null;
  weight: number;
}

export interface MultiPassResult {
  dimensions: Array<{
    criterion_name: string;
    score: number;
    reasoning: string;
  }>;
  overall_reasoning: string;
  pass_data: {
    pass1: Pass1Result;
    pass2: Pass2Result;
  };
}

interface Pass1Result {
  thesis_score: number;
  thesis_reasoning: string;
  file_references: string[];
  claims: string[];
}

interface Pass2Result {
  code_score: number;
  code_reasoning: string;
  claim_verification: Array<{
    claim: string;
    verified: boolean;
    evidence: string;
  }>;
  files_reviewed: string[];
}

interface LLMCaller {
  call(prompt: string, submissionId?: string): Promise<unknown>;
}

// ── Schemas ────────────────────────────────────────────────

const pass1Schema = z.object({
  thesis_score: z.number().min(0).max(100),
  thesis_reasoning: z.string(),
  file_references: z.array(z.string()),
  claims: z.array(z.string()),
});

const pass2Schema = z.object({
  code_score: z.number().min(0).max(100),
  code_reasoning: z.string(),
  claim_verification: z.array(
    z.object({
      claim: z.string(),
      verified: z.boolean(),
      evidence: z.string(),
    })
  ),
});

const pass3Schema = z.object({
  dimensions: z.array(
    z.object({
      criterion_name: z.string(),
      score: z.number().min(0).max(100),
      reasoning: z.string(),
    })
  ),
  overall_reasoning: z.string(),
});

// ── Constants ──────────────────────────────────────────────

const MAX_FILE_SIZE_CHARS = 20_000;
const MAX_CODE_FILES_PER_PASS = 15;
const PASS_MAX_RETRIES = 3;
const PASS_BACKOFF_BASE_MS = 1000;

const ENTRY_POINT_PATTERNS = [
  "index.ts", "index.js", "main.ts", "main.js", "main.py", "app.ts",
  "app.js", "app.py", "server.ts", "server.js", "mod.rs", "main.go",
  "main.rs", "lib.rs",
];

// ── Main Entry Point ───────────────────────────────────────

export async function multiPassLlmEval(params: {
  task: Record<string, unknown>;
  criteria: RubricCriterion[];
  submissionContract: SubmissionContract;
  fileIndex: FileIndexEntry[];
  fetchFile: (filename: string) => Promise<string | null>;
  buildResult?: string;
  llm: LLMCaller;
  submissionId?: string;
}): Promise<MultiPassResult | null> {
  const { task, criteria, submissionContract, fileIndex, fetchFile, buildResult, llm, submissionId } = params;
  const filenames = fileIndex.map((f) => f.name);

  // ── Pass 1: Thesis Review ────────────────────────────
  const docFiles = getDocFiles(submissionContract, filenames);
  const docContents = await fetchMultiple(docFiles, fetchFile);

  if (docContents.size === 0) {
    // No docs to read — can't do multi-pass meaningfully
    return null;
  }

  const pass1 = await runPass1(task, docContents, llm, submissionId);
  if (!pass1) return null;

  // ── Pass 2: Code Audit ───────────────────────────────
  const codeFiles = selectCodeFiles(pass1.file_references, filenames, submissionContract);
  const codeContents = await fetchMultiple(codeFiles, fetchFile);

  const pass2 = await runPass2(task, pass1, codeContents, llm, submissionId);
  if (!pass2) return null;

  // ── Pass 3: Synthesis ────────────────────────────────
  const pass3 = await runPass3(task, criteria, pass1, pass2, buildResult, llm, submissionId);
  if (!pass3) return null;

  return {
    dimensions: pass3.dimensions,
    overall_reasoning: pass3.overall_reasoning,
    pass_data: { pass1, pass2 },
  };
}

// ── File Selection ─────────────────────────────────────────

function getDocFiles(contract: SubmissionContract, filenames: string[]): string[] {
  const docs = new Set<string>();

  // Required files from contract that look like documentation
  for (const req of contract.required_files ?? []) {
    if (filenames.includes(req.path)) {
      docs.add(req.path);
    }
  }

  // Also grab any .md files in the submission (up to 10)
  for (const name of filenames) {
    if (name.toLowerCase().endsWith(".md") && docs.size < 10) {
      docs.add(name);
    }
  }

  return Array.from(docs);
}

function selectCodeFiles(
  fileReferences: string[],
  allFilenames: string[],
  contract: SubmissionContract
): string[] {
  const selected = new Set<string>();

  // 1. Files explicitly referenced in the agent's docs
  for (const ref of fileReferences) {
    // The agent might reference "src/auth/handler.ts" but the file is stored as "src/auth/handler.ts"
    const match = allFilenames.find(
      (f) => f === ref || f.endsWith(`/${ref}`) || ref.endsWith(`/${f}`)
    );
    if (match) selected.add(match);
  }

  // 2. Entry point files
  for (const pattern of ENTRY_POINT_PATTERNS) {
    const match = allFilenames.find(
      (f) => f === pattern || f.endsWith(`/${pattern}`)
    );
    if (match) selected.add(match);
  }

  // 3. Sample from contract's required_patterns (code files, not docs)
  for (const pat of contract.required_patterns ?? []) {
    // Simple heuristic: patterns with code extensions
    const codeMatches = allFilenames.filter(
      (f) => !f.toLowerCase().endsWith(".md") && selected.size < MAX_CODE_FILES_PER_PASS
    );
    for (const m of codeMatches.slice(0, 3)) {
      selected.add(m);
    }
  }

  // Cap at MAX_CODE_FILES_PER_PASS
  return Array.from(selected).slice(0, MAX_CODE_FILES_PER_PASS);
}

// ── File Fetching ──────────────────────────────────────────

async function fetchMultiple(
  filenames: string[],
  fetchFile: (name: string) => Promise<string | null>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const name of filenames) {
    const content = await fetchFile(name);
    if (content !== null) {
      // Cap individual file size
      if (content.length > MAX_FILE_SIZE_CHARS) {
        results.set(
          name,
          content.slice(0, MAX_FILE_SIZE_CHARS) +
            `\n\n[File truncated at ${MAX_FILE_SIZE_CHARS} chars — ${content.length} total]`
        );
      } else {
        results.set(name, content);
      }
    }
  }

  return results;
}

function formatFileContents(files: Map<string, string>): string {
  return Array.from(files.entries())
    .map(([name, content]) => `--- ${name} ---\n${content}`)
    .join("\n\n");
}

// ── LLM Call with Retry ────────────────────────────────────

async function callWithRetry<T>(
  llm: LLMCaller,
  prompt: string,
  schema: z.ZodType<T>,
  submissionId?: string
): Promise<T | null> {
  for (let attempt = 1; attempt <= PASS_MAX_RETRIES; attempt++) {
    const raw = await llm.call(prompt, submissionId);
    if (raw === null) {
      if (attempt < PASS_MAX_RETRIES) {
        await sleep(PASS_BACKOFF_BASE_MS * Math.pow(3, attempt - 1));
      }
      continue;
    }

    const validated = schema.safeParse(raw);
    if (validated.success) return validated.data;

    // Schema mismatch — retry
    if (attempt < PASS_MAX_RETRIES) {
      await sleep(PASS_BACKOFF_BASE_MS * Math.pow(3, attempt - 1));
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Pass 1: Thesis Review ──────────────────────────────────

async function runPass1(
  task: Record<string, unknown>,
  docContents: Map<string, string>,
  llm: LLMCaller,
  submissionId?: string
): Promise<Pass1Result | null> {
  const docsText = formatFileContents(docContents);

  const prompt = `You are an expert evaluator reviewing an AI agent's documentation for a competition submission.

## Task
Title: ${task.title}
Description: ${task.description}

## Input Specification
${task.input_spec}

## Output Specification
${task.output_spec}

## Agent's Documentation
${docsText}

## Your Job (Pass 1: Thesis Review)

Read the agent's documentation and evaluate:
1. Does the agent understand the problem?
2. Is the proposed approach sound and well-reasoned?
3. Are claims specific and verifiable (e.g., "handles 5 edge cases" vs "it works")?
4. Are there red flags? (vague claims, boilerplate, contradictions, overclaiming)

Also extract:
- **file_references**: specific source code filenames the agent mentions (e.g., "src/auth/handler.ts", "main.py"). These will be audited in the next pass.
- **claims**: concrete, verifiable claims the agent makes about their solution (e.g., "Handles concurrent writes with mutex locks", "Achieves O(n log n) time complexity"). Extract 3-10 of the most important claims.

Respond ONLY with valid JSON:
{
  "thesis_score": 0-100,
  "thesis_reasoning": "2-4 sentences summarizing the documentation quality",
  "file_references": ["path/to/file.ts", ...],
  "claims": ["claim 1", "claim 2", ...]
}`;

  return callWithRetry(llm, prompt, pass1Schema, submissionId);
}

// ── Pass 2: Code Audit ─────────────────────────────────────

async function runPass2(
  task: Record<string, unknown>,
  pass1: Pass1Result,
  codeContents: Map<string, string>,
  llm: LLMCaller,
  submissionId?: string
): Promise<Pass2Result | null> {
  const codeText = formatFileContents(codeContents);
  const claimsList = pass1.claims.map((c, i) => `${i + 1}. ${c}`).join("\n");
  const filesReviewed = Array.from(codeContents.keys());

  const prompt = `You are an expert code reviewer auditing an AI agent's submission for a competition.

## Task
Title: ${task.title}
Description: ${task.description}

## Agent's Claims (from their documentation)
${claimsList}

## Agent's Thesis Summary (from Pass 1)
Score: ${pass1.thesis_score}/100
${pass1.thesis_reasoning}

## Source Code (targeted files)
${codeText || "(No code files found to review)"}

## Your Job (Pass 2: Code Audit)

Cross-reference the agent's claims against the actual code:
1. For each claim, determine if the code supports it. Cite specific evidence.
2. Look for: correct implementations, missing features, bugs, hardcoded values, incomplete error handling.
3. Assess overall code quality: structure, naming, patterns, maintainability.

Respond ONLY with valid JSON:
{
  "code_score": 0-100,
  "code_reasoning": "2-4 sentences summarizing code quality and claim accuracy",
  "claim_verification": [
    {
      "claim": "the original claim text",
      "verified": true/false,
      "evidence": "1-2 sentences citing specific code"
    }
  ]
}`;

  const result = await callWithRetry(llm, prompt, pass2Schema, submissionId);
  if (result) {
    return { ...result, files_reviewed: filesReviewed };
  }
  return null;
}

// ── Pass 3: Holistic Synthesis ─────────────────────────────

async function runPass3(
  task: Record<string, unknown>,
  criteria: RubricCriterion[],
  pass1: Pass1Result,
  pass2: Pass2Result,
  buildResult: string | undefined,
  llm: LLMCaller,
  submissionId?: string
): Promise<{ dimensions: MultiPassResult["dimensions"]; overall_reasoning: string } | null> {
  const criteriaList = criteria
    .map((c, i) => `${i + 1}. ${c.name} (weight: ${c.weight}%)${c.description ? `: ${c.description}` : ""}`)
    .join("\n");

  const claimVerification = pass2.claim_verification
    .map((cv) => `- "${cv.claim}" → ${cv.verified ? "VERIFIED" : "NOT VERIFIED"}: ${cv.evidence}`)
    .join("\n");

  const prompt = `You are an expert evaluator producing final scores for an AI agent's competition submission.

## Task
Title: ${task.title}
Description: ${task.description}

## Rubric Criteria
${criteriaList}

## Pass 1: Thesis Review (documentation quality)
Score: ${pass1.thesis_score}/100
${pass1.thesis_reasoning}

## Pass 2: Code Audit (claim verification)
Score: ${pass2.code_score}/100
${pass2.code_reasoning}

Claim Verification:
${claimVerification}

Files Reviewed: ${pass2.files_reviewed.join(", ")}

${buildResult ? `## Platform Build Check\n${buildResult}\n` : ""}
## Your Job (Pass 3: Final Scoring)

Map the thesis review and code audit onto the rubric criteria above. For each criterion:
- A criterion about "Code Quality" should lean on the code audit (Pass 2)
- A criterion about "Documentation" or "Problem Understanding" should lean on the thesis review (Pass 1)
- A criterion about "Correctness" should weight claim verification heavily
- Consider the build check result if relevant

Score each criterion 0-100:
- 0 = completely failed
- 25 = poor, major issues
- 50 = acceptable, meets basic requirements
- 75 = good, solid work with minor issues
- 100 = excellent, exceeds expectations

Respond ONLY with valid JSON:
{
  "dimensions": [
    {
      "criterion_name": "exact name from rubric",
      "score": 0-100,
      "reasoning": "1-3 sentences, referencing Pass 1/2 findings"
    }
  ],
  "overall_reasoning": "2-4 sentence summary synthesizing all passes"
}`;

  return callWithRetry(llm, prompt, pass3Schema, submissionId);
}
