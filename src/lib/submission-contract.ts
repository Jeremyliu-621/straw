import { z } from "zod/v4";
import picomatch from "picomatch";
import {
  CONTRACT_MAX_TOTAL_SIZE_MB_DEFAULT,
  CONTRACT_MAX_TOTAL_SIZE_MB_FLOOR,
  CONTRACT_MAX_TOTAL_SIZE_MB_CEILING,
} from "@/constants";

// ── Schema ─────────────────────────────────────────────────

const requiredFileSchema = z.object({
  path: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  max_size_kb: z.number().int().min(1).max(102400).optional(), // up to 100MB per file
});

const requiredPatternSchema = z.object({
  glob: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  min_files: z.number().int().min(1).optional().default(1),
});

const optionalFileSchema = z.object({
  path: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
});

export const submissionContractSchema = z.object({
  required_files: z.array(requiredFileSchema).optional().default([]),
  required_patterns: z.array(requiredPatternSchema).optional().default([]),
  optional_files: z.array(optionalFileSchema).optional().default([]),
  max_total_size_mb: z
    .number()
    .min(CONTRACT_MAX_TOTAL_SIZE_MB_FLOOR)
    .max(CONTRACT_MAX_TOTAL_SIZE_MB_CEILING)
    .optional()
    .default(CONTRACT_MAX_TOTAL_SIZE_MB_DEFAULT),
});

export type SubmissionContract = z.infer<typeof submissionContractSchema>;
export type RequiredFile = z.infer<typeof requiredFileSchema>;
export type RequiredPattern = z.infer<typeof requiredPatternSchema>;

// ── Validation ─────────────────────────────────────────────

export interface ContractValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a set of submitted files against a task's submission contract.
 *
 * Checks:
 * 1. All required files are present
 * 2. Per-file size limits are respected (uses decoded byte count, so binary uploads
 *    are sized correctly — a 1MB image is 1MB, not the 1.33MB of its base64 form)
 * 3. Required glob patterns have enough matching files
 * 4. Total submission size is within the contract limit
 *
 * Files are passed in pre-decoded as `Record<string, Buffer>` so this function
 * doesn't need to know about encoding modes.
 */
export function validateSubmissionAgainstContract(
  files: Record<string, Buffer>,
  contract: SubmissionContract
): ContractValidationResult {
  const errors: string[] = [];
  const filenames = Object.keys(files);

  // 1. Required files
  for (const req of contract.required_files) {
    if (!filenames.includes(req.path)) {
      const desc = req.description ? ` — ${req.description}` : "";
      errors.push(`Missing required file: ${req.path}${desc}`);
      continue;
    }

    // Per-file size check (decoded bytes — accurate for both text and binary)
    if (req.max_size_kb !== undefined) {
      const sizeBytes = files[req.path].byteLength;
      const limitBytes = req.max_size_kb * 1024;
      if (sizeBytes > limitBytes) {
        const actualKb = Math.ceil(sizeBytes / 1024);
        errors.push(
          `File ${req.path} exceeds size limit: ${actualKb}KB > ${req.max_size_kb}KB`
        );
      }
    }
  }

  // 2. Required patterns
  for (const pat of contract.required_patterns) {
    const matcher = picomatch(pat.glob);
    const matches = filenames.filter((f) => matcher(f));
    const minFiles = pat.min_files ?? 1;

    if (matches.length < minFiles) {
      const desc = pat.description ? ` (${pat.description})` : "";
      errors.push(
        `Pattern "${pat.glob}"${desc} requires at least ${minFiles} file(s), found ${matches.length}`
      );
    }
  }

  // 3. Total size (decoded bytes)
  const totalBytes = Object.values(files).reduce(
    (sum, buffer) => sum + buffer.byteLength,
    0
  );
  const limitBytes = (contract.max_total_size_mb ?? CONTRACT_MAX_TOTAL_SIZE_MB_DEFAULT) * 1024 * 1024;
  if (totalBytes > limitBytes) {
    const actualMb = (totalBytes / (1024 * 1024)).toFixed(1);
    errors.push(
      `Total submission size ${actualMb}MB exceeds limit of ${contract.max_total_size_mb ?? CONTRACT_MAX_TOTAL_SIZE_MB_DEFAULT}MB`
    );
  }

  return { valid: errors.length === 0, errors };
}
