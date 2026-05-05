# Phase 18 Results

## Date: 2026-04-15

---

## 18a: Remove Blockers

Seed script already existed at `scripts/seed-competition.ts`. Eval worker running locally.

---

## 18b: Create 2-3 Real Tasks

Created via `scripts/seed-more-tasks.ts` using the service client against the existing company user (`bb5b5819-f0e2-4f09-ae6f-53de6475f129`).

| # | Title | Task ID | Category | Eval Mode | Status |
|---|-------|---------|----------|-----------|--------|
| 1 | Build a Markdown-to-HTML converter | `44ddb3a1-82ee-4189-aa94-97153af66f86` | code-generation | LLM | open |
| 2 | Build a URL shortener API | `1692c106-217c-484d-b240-bb2f1a3321bc` | code-generation | LLM | open |
| 3 | Parse and normalize messy CSV data | `18e2ee75-32ca-4a4f-91c3-fc3905a5b70b` | data-analysis | LLM | open |

All tasks have:
- 4 rubric criteria with weights summing to 100%
- 7-day deadlines
- Detailed input/output specs
- LLM-only evaluation (test_weight: 0, llm_weight: 100)

---

## 18c: Compete with 3 Quality Tiers (Markdown Task)

Submitted via `scripts/submit-tiers.ts` using the v1 API flow:
1. `POST /api/v1/tasks/{id}/submissions` to create submission
2. `POST /api/v1/submissions/{id}/upload` with zip file (application/octet-stream)
3. `GET /api/v1/submissions/{id}` to poll for evaluation results

### Score Summary

| Tier | Display Name | Submission ID | Final Score |
|------|-------------|---------------|-------------|
| 1 - Thorough | claude-opus-agent | `6d6c3cb0-9106-4463-8736-4108837d63bf` | **95.75** |
| 2 - Quick & Functional | quick-agent | `63dd861e-69cf-4ce5-9c9c-6daf2c220a34` | **45.00** |
| 3 - Minimal Effort | minimal-agent | `c2214cb7-1325-4fa9-be23-e23f84c7f2e7` | **36.25** |

**Score ordering correct: YES** (95.75 > 45 > 36.25)

### Per-Criterion Breakdown

#### Tier 1 (Thorough, 95.75)
| Criterion | Weight | Score | Summary |
|-----------|--------|-------|---------|
| Correctness | 35% | 95 | All required syntax handled correctly including nested lists and code blocks |
| Code Quality | 25% | 90 | Well-structured with clear separation of concerns |
| Completeness | 25% | 100 | All required + all bonus features implemented |
| Documentation | 15% | 100 | Clear README, outstanding SUBMISSION.md |

#### Tier 2 (Quick, 45.00)
| Criterion | Weight | Score | Summary |
|-----------|--------|-------|---------|
| Correctness | 35% | 25 | Fails on nested lists, HTML entity escaping, missing several block elements |
| Code Quality | 25% | 60 | Reasonably structured but not robust for full Markdown |
| Completeness | 25% | 25 | Missing images, blockquotes, horizontal rules, nested lists |
| Documentation | 15% | 100 | Excellent README and honest SUBMISSION.md |

#### Tier 3 (Minimal, 36.25)
| Criterion | Weight | Score | Summary |
|-----------|--------|-------|---------|
| Correctness | 35% | 25 | Only handles headings and basic bold/italic |
| Code Quality | 25% | 30 | Readable but lacks structure for the task |
| Completeness | 25% | 20 | Most Markdown features not implemented |
| Documentation | 15% | 100 | Exceptionally clear and honest about limitations |

---

## 18d: Validate the Loop

### Leaderboard Verification

- `GET /api/v1/tasks/{id}/leaderboard` returns ranked entries
- Leaderboard deduplicates by agent (best score per agent shown)
- Since all 3 tiers used the same API key (same agent), leaderboard shows 1 entry at 95.75
- Anonymization working correctly (identities hidden before deadline)
- Score ordering makes sense: thoroughness is rewarded, incomplete work is penalized

### Key Observations

1. **The LLM judge differentiates quality clearly.** The gap between thorough (95.75) and quick (45) is stark. The judge correctly identified missing features and penalized accordingly.

2. **Documentation gets full marks even for bad code.** Both tier 2 and tier 3 scored 100 on Documentation because they had honest, well-written SUBMISSION.md files. The LLM rewards transparency about limitations. This is a good incentive structure.

3. **The ordering is correct but the scale is compressed at the bottom.** Tier 2 (functional but incomplete) scored only slightly above tier 3 (barely anything). The Correctness and Completeness criteria dominate the overall score, which is correct given their combined 60% weight.

4. **Evaluation latency is good.** Each evaluation completed in 5-15 seconds. Acceptable for a polling-based flow.

5. **Leaderboard deduplication works correctly.** Only the best score per agent appears, which is the intended behavior per REQUIREMENTS.md.

---

## Bugs Found

None. The full pipeline works end-to-end:
- Task creation via Supabase service client
- Submission creation via v1 API with Bearer auth
- File upload via v1 upload endpoint
- Automatic evaluation enqueueing
- Gemini LLM judge scoring with per-criterion breakdowns
- Leaderboard ranking with anonymization

---

## Files Created/Modified

- `scripts/seed-more-tasks.ts` — creates URL shortener + CSV parser tasks
- `scripts/submit-tiers.ts` — submits quick + minimal tiers, polls for scores
- `tasks/phase18-results.md` — this file
