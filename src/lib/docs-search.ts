/**
 * Docs search — substring-match across all MDX pages under content/docs/.
 *
 * For our scale (~30 pages) this is fine without a real search engine.
 * Walks the filesystem on each query, scores per-page by:
 *   - title hits weighted 5x
 *   - heading hits weighted 3x
 *   - body hits weighted 1x
 * Returns top N matches sorted by score, with a snippet around the
 * highest-scoring body match.
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { extractHeadings } from "./docs";

const DOCS_ROOT = path.join(process.cwd(), "content", "docs");

export interface DocsSearchHit {
  slug: string;
  title: string;
  description?: string;
  snippet: string;
  score: number;
}

interface IndexedPage {
  slug: string;
  title: string;
  description: string;
  headings: string[];
  body: string;
}

let cachedIndex: IndexedPage[] | null = null;

function readIndex(): IndexedPage[] {
  if (cachedIndex) return cachedIndex;
  const pages: IndexedPage[] = [];
  if (!fs.existsSync(DOCS_ROOT)) {
    cachedIndex = pages;
    return pages;
  }
  walk(DOCS_ROOT, [], pages);
  cachedIndex = pages;
  return pages;
}

function walk(dir: string, slug: string[], out: IndexedPage[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      walk(path.join(dir, entry.name), [...slug, entry.name], out);
      continue;
    }
    if (!entry.name.endsWith(".mdx")) continue;
    const stem = entry.name.replace(/\.mdx$/, "");
    const fullSlug = stem === "index" ? slug : [...slug, stem];
    const raw = fs.readFileSync(path.join(dir, entry.name), "utf8");
    const { data, content } = matter(raw);
    out.push({
      slug: fullSlug.join("/"),
      title: typeof data.title === "string" ? data.title : fullSlug.join(" / "),
      description: typeof data.description === "string" ? data.description : "",
      headings: extractHeadings(content).map((h) => h.text),
      body: stripMarkdown(content),
    });
  }
}

function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_>~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Used in dev — the docs index is per-process. Re-reading on every query
 * is fine at ~30 pages, but we cache to keep results snappy. Call to bust
 * the cache after editing MDX in dev.
 */
export function invalidateDocsIndex() {
  cachedIndex = null;
}

export function searchDocs(query: string, limit = 10): DocsSearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return [];

  const pages = readIndex();
  const hits: DocsSearchHit[] = [];

  for (const page of pages) {
    const titleLower = page.title.toLowerCase();
    const descLower = page.description.toLowerCase();
    const headingsLower = page.headings.map((h) => h.toLowerCase());
    const bodyLower = page.body.toLowerCase();

    let score = 0;
    for (const tok of tokens) {
      if (titleLower.includes(tok)) score += 5;
      if (descLower.includes(tok)) score += 4;
      for (const h of headingsLower) if (h.includes(tok)) score += 3;
      const bodyHits = countOccurrences(bodyLower, tok);
      score += Math.min(bodyHits, 5); // cap at 5 to avoid runaway weight
    }

    if (score === 0) continue;
    hits.push({
      slug: page.slug,
      title: page.title,
      description: page.description || undefined,
      snippet: snippetAround(page.body, tokens[0], 140),
      score,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    count++;
    i += needle.length;
  }
  return count;
}

function snippetAround(body: string, token: string, len: number): string {
  if (!token) return body.slice(0, len) + (body.length > len ? "…" : "");
  const lower = body.toLowerCase();
  const idx = lower.indexOf(token);
  if (idx === -1) return body.slice(0, len) + (body.length > len ? "…" : "");
  const start = Math.max(0, idx - Math.floor(len / 3));
  const end = Math.min(body.length, start + len);
  let snippet = body.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < body.length) snippet = snippet + "…";
  return snippet;
}
