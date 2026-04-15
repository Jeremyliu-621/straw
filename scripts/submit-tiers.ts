/**
 * Submit 2 quality tiers (quick + minimal) to the Markdown-to-HTML task.
 *
 * Tier 1 (thorough, 95.75) already exists.
 * This creates Tier 2 (quick/functional) and Tier 3 (minimal effort).
 *
 * Usage: npx tsx scripts/submit-tiers.ts
 */

const BASE_URL = "http://localhost:3000";
const API_KEY = "straw_sk_ec0e57328085023cbf21aed813e2ec464430e8120e7276d7c117b46d10f3615f";
const TASK_ID = "44ddb3a1-82ee-4189-aa94-97153af66f86";

// ── Tier 2: Quick and functional ────────────────────────────

const TIER2_FILES: Record<string, string> = {
  "SUBMISSION.md": `# SUBMISSION.md

## What I Built
A quick Markdown-to-HTML converter in Python that handles the core syntax elements.

## How To Run
\`\`\`bash
python3 convert.py input.md
# or
cat input.md | python3 convert.py
\`\`\`

## Architecture
Single-file Python script using regex replacements. Processes the input line-by-line for block elements, then applies inline formatting.

## What Works
- Headings (h1-h6)
- Bold and italic
- Inline code
- Fenced code blocks
- Links
- Unordered and ordered lists (flat only)
- Paragraphs

## Known Limitations
- Nested lists are not supported (items are flattened)
- No blockquote support
- No image support
- No horizontal rules
- Code blocks don't escape HTML entities

## Tradeoffs
Prioritized speed of implementation over completeness. The regex approach is simple but doesn't handle complex nesting. Good enough for basic Markdown but will fail on edge cases.
`,

  "convert.py": `#!/usr/bin/env python3
"""Quick Markdown to HTML converter."""
import sys
import re

def convert(md: str) -> str:
    lines = md.split("\\n")
    html_parts = []
    in_code_block = False
    in_list = False
    list_type = None

    for line in lines:
        # Code blocks
        if line.strip().startswith("\`\`\`"):
            if in_code_block:
                html_parts.append("</code></pre>")
                in_code_block = False
            else:
                lang = line.strip()[3:].strip()
                html_parts.append(f'<pre><code class="{lang}">' if lang else "<pre><code>")
                in_code_block = True
            continue

        if in_code_block:
            html_parts.append(line)
            continue

        stripped = line.strip()

        # Empty line ends list
        if not stripped:
            if in_list:
                html_parts.append(f"</{list_type}>")
                in_list = False
                list_type = None
            continue

        # Headings
        heading_match = re.match(r'^(#{1,6})\\s+(.+)', stripped)
        if heading_match:
            if in_list:
                html_parts.append(f"</{list_type}>")
                in_list = False
            level = len(heading_match.group(1))
            text = inline_format(heading_match.group(2))
            html_parts.append(f"<h{level}>{text}</h{level}>")
            continue

        # Unordered list
        if re.match(r'^[-*+]\\s+', stripped):
            item_text = inline_format(re.sub(r'^[-*+]\\s+', '', stripped))
            if not in_list or list_type != "ul":
                if in_list:
                    html_parts.append(f"</{list_type}>")
                html_parts.append("<ul>")
                in_list = True
                list_type = "ul"
            html_parts.append(f"<li>{item_text}</li>")
            continue

        # Ordered list
        ol_match = re.match(r'^\\d+\\.\\s+(.+)', stripped)
        if ol_match:
            item_text = inline_format(ol_match.group(1))
            if not in_list or list_type != "ol":
                if in_list:
                    html_parts.append(f"</{list_type}>")
                html_parts.append("<ol>")
                in_list = True
                list_type = "ol"
            html_parts.append(f"<li>{item_text}</li>")
            continue

        # Paragraph
        if in_list:
            html_parts.append(f"</{list_type}>")
            in_list = False
        html_parts.append(f"<p>{inline_format(stripped)}</p>")

    if in_list:
        html_parts.append(f"</{list_type}>")
    if in_code_block:
        html_parts.append("</code></pre>")

    return "\\n".join(html_parts)


def inline_format(text: str) -> str:
    # Bold
    text = re.sub(r'\\*\\*(.+?)\\*\\*', r'<strong>\\1</strong>', text)
    # Italic
    text = re.sub(r'\\*(.+?)\\*', r'<em>\\1</em>', text)
    # Inline code
    text = re.sub(r'\`([^\`]+)\`', r'<code>\\1</code>', text)
    # Links
    text = re.sub(r'\\[([^\\]]+)\\]\\(([^)]+)\\)', r'<a href="\\2">\\1</a>', text)
    return text


if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1]) as f:
            md = f.read()
    else:
        md = sys.stdin.read()

    print(convert(md))
`,

  "README.md": `# Markdown to HTML Converter

A simple Python script that converts Markdown to HTML.

## Usage

\`\`\`bash
python3 convert.py input.md
# or pipe input
cat input.md | python3 convert.py
\`\`\`

## Requirements
- Python 3.6+

## Supported Syntax
- Headings, bold, italic, inline code
- Fenced code blocks
- Links
- Unordered and ordered lists
- Paragraphs
`,
};

// ── Tier 3: Minimal effort ──────────────────────────────────

const TIER3_FILES: Record<string, string> = {
  "SUBMISSION.md": `# SUBMISSION.md

## What I Built
Bare-bones Markdown to HTML converter.

## How To Run
\`\`\`
python3 convert.py < input.md
\`\`\`

## Architecture
Single script with regex.

## What Works
Headings and bold text.

## Known Limitations
Most Markdown features not implemented. No lists, no code blocks, no links, no images, no blockquotes.

## Tradeoffs
Minimal time investment. Only handles the absolute basics.
`,

  "convert.py": `#!/usr/bin/env python3
"""Minimal markdown converter."""
import sys, re

text = sys.stdin.read()
lines = text.split("\\n")
out = []
for line in lines:
    s = line.strip()
    if not s:
        continue
    m = re.match(r'^(#{1,6})\\s+(.*)', s)
    if m:
        lvl = len(m.group(1))
        out.append(f"<h{lvl}>{m.group(2)}</h{lvl}>")
    else:
        s = re.sub(r'\\*\\*(.+?)\\*\\*', r'<strong>\\1</strong>', s)
        s = re.sub(r'\\*(.+?)\\*', r'<em>\\1</em>', s)
        out.append(f"<p>{s}</p>")

print("\\n".join(out))
`,
};

// ── Zip creation using raw binary ───────────────────────────

/**
 * Create a minimal zip file from a Record<filename, content>.
 * Uses the standard PKZIP spec (no compression, store only).
 */
function createZip(files: Record<string, string>): Buffer {
  const entries: Array<{
    name: Buffer;
    data: Buffer;
    crc: number;
    offset: number;
  }> = [];
  const parts: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, "utf-8");
    const dataBytes = Buffer.from(content, "utf-8");
    const crc = crc32(dataBytes);

    // Local file header (30 bytes + name + data)
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); // local file header signature
    header.writeUInt16LE(20, 4);         // version needed (2.0)
    header.writeUInt16LE(0, 6);          // general purpose bit flag
    header.writeUInt16LE(0, 8);          // compression method (stored)
    header.writeUInt16LE(0, 10);         // last mod time
    header.writeUInt16LE(0, 12);         // last mod date
    header.writeUInt32LE(crc, 14);       // crc-32
    header.writeUInt32LE(dataBytes.length, 18); // compressed size
    header.writeUInt32LE(dataBytes.length, 22); // uncompressed size
    header.writeUInt16LE(nameBytes.length, 26); // file name length
    header.writeUInt16LE(0, 28);         // extra field length

    entries.push({ name: nameBytes, data: dataBytes, crc, offset });
    parts.push(header, nameBytes, dataBytes);
    offset += 30 + nameBytes.length + dataBytes.length;
  }

  // Central directory
  const cdStart = offset;
  for (const entry of entries) {
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // central directory header
    cdHeader.writeUInt16LE(20, 4);          // version made by
    cdHeader.writeUInt16LE(20, 6);          // version needed
    cdHeader.writeUInt16LE(0, 8);           // flags
    cdHeader.writeUInt16LE(0, 10);          // compression
    cdHeader.writeUInt16LE(0, 12);          // mod time
    cdHeader.writeUInt16LE(0, 14);          // mod date
    cdHeader.writeUInt32LE(entry.crc, 16);
    cdHeader.writeUInt32LE(entry.data.length, 20);
    cdHeader.writeUInt32LE(entry.data.length, 24);
    cdHeader.writeUInt16LE(entry.name.length, 28);
    cdHeader.writeUInt16LE(0, 30);          // extra field length
    cdHeader.writeUInt16LE(0, 32);          // file comment length
    cdHeader.writeUInt16LE(0, 34);          // disk number start
    cdHeader.writeUInt16LE(0, 36);          // internal file attributes
    cdHeader.writeUInt32LE(0, 38);          // external file attributes
    cdHeader.writeUInt32LE(entry.offset, 42);

    parts.push(cdHeader, entry.name);
    offset += 46 + entry.name.length;
  }

  const cdSize = offset - cdStart;

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);              // disk number
  eocd.writeUInt16LE(0, 6);              // disk with CD
  eocd.writeUInt16LE(entries.length, 8); // entries on disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);             // comment length
  parts.push(eocd);

  return Buffer.concat(parts);
}

/** CRC-32 (standard polynomial) */
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── API helpers ─────────────────────────────────────────────

async function apiCall(method: string, path: string, body?: unknown): Promise<unknown> {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return res.json();
}

async function uploadZip(submissionId: string, zipBuffer: Buffer): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/v1/submissions/${submissionId}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(zipBuffer),
  });
  return res.json();
}

async function pollForScore(submissionId: string, label: string): Promise<Record<string, unknown>> {
  const maxWait = 120_000; // 2 minutes
  const interval = 5_000;  // 5 seconds
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const result = (await apiCall("GET", `/api/v1/submissions/${submissionId}`)) as Record<string, unknown>;
    if (result.evaluated) {
      return result;
    }
    process.stdout.write(`  [${label}] Waiting for evaluation... (${Math.round((Date.now() - start) / 1000)}s)\r`);
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`Timeout waiting for evaluation of ${submissionId}`);
}

// ── Main ────────────────────────────────────────────────────

async function submitTier(
  label: string,
  displayName: string,
  files: Record<string, string>
): Promise<Record<string, unknown>> {
  console.log(`\n  ── ${label} ──`);

  // 1. Create submission
  console.log("  Creating submission...");
  const createResult = (await apiCall("POST", `/api/v1/tasks/${TASK_ID}/submissions`, {
    agent_display_name: displayName,
  })) as Record<string, unknown>;

  const submissionId = createResult.id as string;
  if (!submissionId) {
    console.error("  Failed to create submission:", JSON.stringify(createResult));
    throw new Error("Failed to create submission");
  }
  console.log(`  Submission ID: ${submissionId}`);

  // 2. Create zip and upload
  console.log("  Building zip...");
  const zipBuffer = createZip(files);
  console.log(`  Zip size: ${zipBuffer.length} bytes`);

  console.log("  Uploading...");
  const uploadResult = (await uploadZip(submissionId, zipBuffer)) as Record<string, unknown>;
  console.log(`  Upload result: ${(uploadResult as Record<string, unknown>).message ?? JSON.stringify(uploadResult)}`);

  // 3. Poll for evaluation
  console.log("  Waiting for evaluation...");
  const result = await pollForScore(submissionId, label);
  const scores = result.scores as Record<string, unknown> | null;
  console.log(`  Final score: ${scores?.final_score ?? "N/A"}`);

  return result;
}

async function main() {
  console.log("\n  Submitting quality tiers to Markdown task...\n");

  const tier2Result = await submitTier(
    "Tier 2: Quick & Functional",
    "quick-agent",
    TIER2_FILES
  );

  const tier3Result = await submitTier(
    "Tier 3: Minimal Effort",
    "minimal-agent",
    TIER3_FILES
  );

  // Summary
  console.log("\n\n  ═══════════════════════════════════════");
  console.log("  RESULTS SUMMARY");
  console.log("  ═══════════════════════════════════════");

  const existingScore = 95.75;
  const t2Scores = tier2Result.scores as Record<string, unknown> | null;
  const t3Scores = tier3Result.scores as Record<string, unknown> | null;

  console.log(`  Tier 1 (Thorough):  ${existingScore}`);
  console.log(`  Tier 2 (Quick):     ${t2Scores?.final_score ?? "N/A"}`);
  console.log(`  Tier 3 (Minimal):   ${t3Scores?.final_score ?? "N/A"}`);

  const t2Score = (t2Scores?.final_score as number) ?? 0;
  const t3Score = (t3Scores?.final_score as number) ?? 0;

  const ordered = existingScore >= t2Score && t2Score >= t3Score;
  console.log(`\n  Ordering correct (thorough > quick > minimal): ${ordered ? "YES" : "NO"}`);

  // Print dimensions for each
  const dimensions = tier2Result.dimensions as Array<Record<string, unknown>>;
  if (dimensions?.length) {
    console.log("\n  Tier 2 Dimensions:");
    for (const d of dimensions) {
      console.log(`    ${d.criterion_name}: ${d.score} — ${(d.reasoning as string)?.slice(0, 100)}...`);
    }
  }

  const dims3 = tier3Result.dimensions as Array<Record<string, unknown>>;
  if (dims3?.length) {
    console.log("\n  Tier 3 Dimensions:");
    for (const d of dims3) {
      console.log(`    ${d.criterion_name}: ${d.score} — ${(d.reasoning as string)?.slice(0, 100)}...`);
    }
  }

  // Write results to JSON file for the results doc
  const results = {
    task_id: TASK_ID,
    submissions: [
      { tier: 1, label: "Thorough", display_name: "claude-opus-agent", score: existingScore, submission_id: "6d6c3cb0-9106-4463-8736-4108837d63bf" },
      { tier: 2, label: "Quick & Functional", display_name: "quick-agent", score: t2Score, submission_id: tier2Result.id },
      { tier: 3, label: "Minimal Effort", display_name: "minimal-agent", score: t3Score, submission_id: tier3Result.id },
    ],
    ordering_correct: ordered,
    tier2_dimensions: dimensions,
    tier3_dimensions: dims3,
  };

  // Write to stdout for capture
  console.log("\n\n  ── RAW RESULTS JSON ──");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("\n  Failed:", err.message);
  process.exit(1);
});
