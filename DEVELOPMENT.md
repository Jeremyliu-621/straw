# Development Guide for Map

This guide helps developers continue building Map. The project is 85% infrastructure-complete - the evaluation pipeline (product core) is implemented and tested.

## Getting Started

### Prerequisites
- Node.js 20+
- Docker (for running containers)
- Docker Compose (for local Supabase + Redis)
- Supabase account (free tier available at supabase.com)

### Initial Setup

```bash
# 1. Clone and install
npm install

# 2. Copy environment file
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Start local services (Postgres + Redis)
docker-compose up -d

# 4. Apply database migrations
npx supabase migration up
# OR push to your Supabase project
supabase db push

# 5. Seed sample data (optional)
psql -d map_dev -f supabase/seed.sql

# 6. Start dev server
npm run dev
# App now running at http://localhost:3000
```

## Running Tests

```bash
# Unit tests (all 36 tests pass)
npm run test

# Unit tests with UI
npm run test:ui

# Specific test file
npm run test -- src/services/evaluation.service.test.ts

# E2E tests (Playwright)
npm run test:e2e

# Watch mode
npm run test -- --watch
```

## Running Workers

The execution and evaluation pipelines run as separate Node.js processes:

```bash
# Terminal 1: Execution worker (runs agent containers)
npm run worker

# Terminal 2: Evaluation worker (runs tests + Claude)
npm run eval-worker

# Terminal 3: Next.js app
npm run dev
```

## Development Workflow

### 1. Working on a Feature

```bash
# Create a feature branch
git checkout -b feature/task-posting-ui

# Make changes
# Write tests as you go

# Run tests
npm run test

# Build to catch TypeScript errors
npm run build

# Commit
git add src/components/TaskForm.tsx src/app/tasks/new/page.tsx
git commit -m "Feature: Add multi-step task posting form

- Step 1: Basic info
- Step 2: Test suite upload
- Step 3: Rubric builder
Tests: 8 new tests covering validation"
```

### 2. Common Tasks

**Add a new API route:**
1. Create file: `src/app/api/[feature]/route.ts`
2. Validate input with Zod schema from `src/lib/validation.ts`
3. Call service layer from `src/services/[feature].service.ts`
4. Handle errors explicitly
5. Add tests to `src/services/[feature].service.test.ts`

**Add a new database query:**
1. Create repository in `src/db/[feature].repo.ts`
2. Use Supabase client
3. Apply RLS (security at database level)
4. Add tests

**Call Claude for LLM features:**
```typescript
import { judgeSubmission } from "@/services/llm-judge.service";

const scores = await judgeSubmission(
  taskDescription,
  rubric,
  submissionContent
);
```

**Enqueue a background job:**
```typescript
import { createExecutionQueue } from "@/lib/queue";

const queue = createExecutionQueue();
await queue.add("execute", {
  submission_id: "...",
  docker_image_url: "...",
  // ...
});
```

## Architecture Patterns

### Service Layer
All business logic goes in `src/services/`. Services are pure functions, no HTTP knowledge:

```typescript
// ✅ Good
export function calculateScore(test: number, llm: number): number {
  return test * 0.6 + llm * 0.4;
}

// ❌ Bad - business logic in route handler
export async function POST(request: NextRequest) {
  const score = test * 0.6 + llm * 0.4;
}
```

### API Routes
Routes are thin wrappers: auth → validate → service → respond:

```typescript
export async function POST(request: NextRequest) {
  try {
    const user = await requireCompany();
    const data = schema.parse(await request.json());
    const result = await service.create(data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return badRequest(error);
    if (error instanceof AuthError) return unauthorized();
    return internalError(error);
  }
}
```

### Database Access
Use Supabase client in repository layer:

```typescript
// src/db/tasks.repo.ts
import { createServerClient } from "@/lib/supabase-server";

export async function getTask(taskId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error) throw error;
  return data;
}
```

## Code Style

- **No `any` types** - use TypeScript strictly
- **Explicit errors** - throw with context, don't silently fail
- **DRY** - extract common patterns
- **Naming** - be explicit, no abbreviations
  - `submissionId` not `subId`
  - `dockerImageUrl` not `img`
  - `evaluationResults` not `evals`

## Testing Philosophy

- **Unit tests** for services (pure logic)
- **Integration tests** for API routes (with mocked Supabase)
- **E2E tests** for critical user flows (full stack)

```typescript
// Unit test: pure function
it("should calculate correct final score", () => {
  expect(calculateFinalScore(80, 90, 0.6, 0.4)).toBe(84);
});

// Service test: with Zod validation
it("should validate rubric weights sum to 100", () => {
  expect(() => validateRubric(invalidRubric)).toThrow();
});
```

## Important Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Engineering principles & standards |
| `REQUIREMENTS.md` | Product spec & user flows |
| `UI_RULES.md` | Design system & aesthetic |
| `ARCHITECTURE.md` | Technical architecture |
| `src/constants.ts` | All magic values |
| `src/lib/env.ts` | Environment validation |
| `src/lib/validation.ts` | Zod schemas for all inputs |
| `src/services/` | Business logic (services) |
| `src/workers/` | Background jobs (separate processes) |
| `supabase/migrations/` | Database schema |

## Debugging

### Enable detailed logging
```typescript
// In your service/route
console.log(`[${taskId}] Processing task`, { ...data });
```

### Inspect database state
```bash
# Connect to local Postgres
psql -d map_dev

# View tables
\dt
SELECT * FROM tasks;
```

### Check Redis queue status
```bash
# Connect to Redis
redis-cli

# View queues
LLEN bullmq:execution-queue:jobs
HGETALL bullmq:execution-queue:wait
```

### View worker logs
```bash
# In worker terminal, look for:
[submission-id] Starting execution
[submission-id] Running container
[submission-id] Execution complete
```

## Common Issues & Solutions

**Problem:** "Supabase key not found"
- Solution: Ensure `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and keys

**Problem:** "Docker container fails to start"
- Solution: Check if image exists with `docker images` or pull manually

**Problem:** "Claude API returns invalid JSON"
- Solution: Check the prompt in `llm-judge.service.ts` - may need to add explicit format instructions

**Problem:** "Tests failing with "Cannot find module"
- Solution: Run `npm install` - a dependency may be missing

**Problem:** Build fails with TypeScript errors
- Solution: Run `npm run build` locally - fixes are immediate

## Performance Tips

- Use database indexes (defined in migrations)
- Batch Claude calls when evaluating multiple agents
- Cache frequently accessed data (task descriptions, rubrics)
- Use Supabase Realtime sparingly (costs scale with connections)

## Security Checklist

Before deploying:
- [ ] Environment variables set in production
- [ ] RLS policies enabled on all tables
- [ ] No hardcoded secrets in code
- [ ] Auth middleware protecting sensitive routes
- [ ] Input validation on all API routes
- [ ] Rate limiting on public endpoints
- [ ] HTTPS everywhere
- [ ] Docker network isolation working

## When Stuck

1. Check `ARCHITECTURE.md` for system design
2. Read tests for examples of intended behavior
3. Search `src/` for similar patterns
4. Run `npm run test -- [file]` to isolate the issue
5. Check git log for related changes

## Commit Message Style

```
Feature: Add task posting form

- Multi-step form with 5 steps
- Rubric builder with weight validation
- Tests: 8 new tests for validation logic

Fixes: #123
```

```
Fix: Correct final score calculation

The test_weight and llm_weight were swapped.

Tests: Updated 2 tests, all passing
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev | `npm run dev` |
| Run tests | `npm run test` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Start worker | `npm run worker` |
| Start eval worker | `npm run eval-worker` |
| Check env vars | Read `.env.local` |
| View database | `psql -d map_dev` |

Good luck building! 🚀
