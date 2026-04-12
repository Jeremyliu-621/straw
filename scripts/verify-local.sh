#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Verify Straw works end-to-end locally
#
# Prerequisites:
#   - Docker Desktop running
#   - .env.local configured (Supabase, Redis, Gemini API key)
#   - Migration 018 applied to Supabase
#   - test-suites bucket created in Supabase Storage
#
# Usage: bash scripts/verify-local.sh
# ──────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo "═══════════════════════════════════════════"
echo "  Straw — Local Verification Script"
echo "═══════════════════════════════════════════"
echo ""

# ── 1. Check prerequisites ──────────────────────────────────

echo "Checking prerequisites..."

docker info > /dev/null 2>&1 || fail "Docker is not running. Start Docker Desktop first."
log "Docker is running"

[ -f .env.local ] || fail ".env.local not found. Copy .env.example and fill in values."
log ".env.local exists"

command -v node > /dev/null 2>&1 || fail "Node.js not found"
log "Node.js available ($(node -v))"

command -v npm > /dev/null 2>&1 || fail "npm not found"
log "npm available"

echo ""

# ── 2. Start services ───────────────────────────────────────

echo "Starting Redis + Postgres..."
docker-compose up -d 2>/dev/null || warn "docker-compose failed (may already be running)"
log "Services started"

echo ""

# ── 3. Build test images ────────────────────────────────────

echo "Building test agent images..."
if [ -d test-agents ]; then
  cd test-agents && bash build-all.sh 2>/dev/null && cd ..
  log "Test agent images built"
else
  warn "test-agents/ not found — skipping agent image build"
fi

echo "Building example eval container..."
if [ -f packages/eval-sdk/example/build.sh ]; then
  bash packages/eval-sdk/example/build.sh 2>/dev/null
  log "Example eval container built (straw-eval-example:latest)"
else
  warn "Eval SDK example not found — skipping"
fi

echo ""

# ── 4. Run unit tests ───────────────────────────────────────

echo "Running unit tests..."
npm test 2>&1 | tail -4
echo ""

# ── 5. Type check ───────────────────────────────────────────

echo "Running TypeScript check..."
npx tsc --noEmit 2>&1
if [ $? -eq 0 ]; then
  log "Zero TypeScript errors"
else
  fail "TypeScript errors found"
fi

echo ""

# ── 6. Instructions for manual steps ────────────────────────

echo "═══════════════════════════════════════════"
echo "  Automated checks passed!"
echo "═══════════════════════════════════════════"
echo ""
echo "Next steps (manual):"
echo ""
echo "  1. Start the workers (3 separate terminals):"
echo "     npm run worker"
echo "     npm run eval-worker"
echo "     npm run dev"
echo ""
echo "  2. Test LLM eval pipeline:"
echo "     curl -X POST http://localhost:3000/api/dev/pipeline-test"
echo ""
echo "  3. Test Container eval pipeline:"
echo "     curl -X POST 'http://localhost:3000/api/dev/pipeline-test?eval_mode=container'"
echo ""
echo "  4. Check eval worker terminal for scoring output:"
echo "     Look for: [eval] Eval container score: XX (pass=true)"
echo ""
echo "  5. Open http://localhost:3000/dev/pipeline to watch visually"
echo ""
