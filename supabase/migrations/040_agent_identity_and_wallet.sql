-- Migration 040: Agent identity + wallet (D37, D40)
--
-- Closes the gap between "agents are well-supported users" and "agents are the
-- customer." Adds the schema needed for:
--   - Three autonomous registration paths (A: USDC stake, B: operator tokens,
--     C: anonymous tier with throttle).
--   - Wallet declaration (payout address + method) on every user.
--   - Payout pipeline (agent_payouts) for paying winners.
--   - Coinbase Commerce webhook idempotency (replay protection — F7).
--   - Anonymous-register rate-limit + audit trail (F1).
--
-- Schema only. Routes, services, and webhook handlers land in subsequent
-- commits. All blocks are idempotent (`IF NOT EXISTS` / `DO $$ ... pg_type ...`)
-- so re-applies are safe.
--
-- Cross-refs:
--   - Spec: tasks/proposals/agent-first-customer-2026-05-07.md
--   - Doctrine: tasks/AGENT_FIRST_DREAM.md (D40)
--   - Security follow-ups: tasks/strategy/agent-first-security-followups.md
--   - Existing api_keys: migration 020
--   - RLS performance pattern: migration 036 (wraps auth.uid() in a sub-select
--     so Postgres caches per-query, not per-row)

BEGIN;

-- ── 1. api_key_tier enum + api_keys.tier ─────────────────────
-- Each api_key carries a tier indicating which registration path minted it.
-- Tier governs anti-abuse policy: anonymous keys hit a quality-floor gate
-- before their submissions count for the leaderboard (see F8).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_key_tier') THEN
    CREATE TYPE api_key_tier AS ENUM (
      'verified',          -- human-attached via GitHub / Google OAuth
      'operator_child',    -- minted by an operator token (D37 path B)
      'staked',            -- bootstrapped by USDC stake (D37 path A)
      'anonymous',         -- bootstrapped by anonymous register (D37 path C)
      'dev'                -- dev credentials (test only)
    );
  END IF;
END $$;

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS tier api_key_tier NOT NULL DEFAULT 'verified';

CREATE INDEX IF NOT EXISTS idx_api_keys_tier
  ON api_keys (tier)
  WHERE revoked_at IS NULL;

-- ── 2. payout_method enum + wallet columns on users ──────────
-- Wallet lives on the user, not the api_key — one user, one wallet, many keys.
-- Format CHECK gates against malformed addresses; per-rail validation lives in
-- the service layer.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_method') THEN
    CREATE TYPE payout_method AS ENUM (
      'onchain_usdc',       -- direct on-chain USDC transfer (default for autonomous agents)
      'coinbase_commerce',  -- via Coinbase Commerce
      'stripe_crypto',      -- via Stripe Crypto (designed, not wired)
      'stripe_usd'          -- via Stripe ACH/wire (designed, not wired)
    );
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS payout_address text,
  ADD COLUMN IF NOT EXISTS payout_method payout_method,
  ADD COLUMN IF NOT EXISTS payout_chain text,
  ADD COLUMN IF NOT EXISTS wallet_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_floor_qualified boolean NOT NULL DEFAULT true;

-- EVM address format gate. Null is fine; non-null must look like 0x + 40 hex.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_payout_address_format'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_payout_address_format
      CHECK (payout_address IS NULL OR payout_address ~ '^0x[0-9a-fA-F]{40}$');
  END IF;
END $$;

-- ── 3. operator_tokens table (D37 path B) ────────────────────
-- An operator (typically a human running a fleet) creates an operator token.
-- Their daemons mint child api_keys against the operator's quota. Operator can
-- rotate or revoke at any time. F3 captures the per-child sub-quota story.

CREATE TABLE IF NOT EXISTS operator_tokens (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash               text NOT NULL,
  prefix                   text NOT NULL,
  label                    text,
  monthly_quota_submissions int  NOT NULL DEFAULT 1000,
  used_quota_submissions   int  NOT NULL DEFAULT 0,
  -- Per-child cap, expressed as percent of monthly_quota_submissions. 100 = no
  -- per-child gate (operator's full quota usable by any child). Lower values
  -- limit blast radius if a child key is compromised. See F3.
  child_quota_pct          int  NOT NULL DEFAULT 100 CHECK (child_quota_pct BETWEEN 1 AND 100),
  revoked_at               timestamptz,
  revoked_reason           text,
  last_used_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operator_tokens_user
  ON operator_tokens (operator_user_id, created_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_operator_tokens_hash
  ON operator_tokens (token_hash);

ALTER TABLE operator_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'operator_tokens'
      AND policyname = 'operator_tokens_owner_select'
  ) THEN
    CREATE POLICY operator_tokens_owner_select ON operator_tokens
      FOR SELECT
      USING (operator_user_id = (SELECT auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'operator_tokens'
      AND policyname = 'operator_tokens_owner_insert'
  ) THEN
    CREATE POLICY operator_tokens_owner_insert ON operator_tokens
      FOR INSERT
      WITH CHECK (operator_user_id = (SELECT auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'operator_tokens'
      AND policyname = 'operator_tokens_owner_update'
  ) THEN
    CREATE POLICY operator_tokens_owner_update ON operator_tokens
      FOR UPDATE
      USING (operator_user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- ── 4. api_keys.operator_token_id ────────────────────────────
-- Link child api_keys back to their operator. Null for non-child keys.
-- Service role keeps the foreign-key relationship; the existing api_keys RLS
-- (user_id = auth.uid()) still scopes who can see what.

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS operator_token_id uuid REFERENCES operator_tokens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_operator_token
  ON api_keys (operator_token_id, created_at DESC)
  WHERE operator_token_id IS NOT NULL;

-- ── 5. agent_payouts table ───────────────────────────────────
-- Tracks money owed to an agent for a win. The payout pipeline reads
-- status='pending', settles via the agent's declared rail, and updates status
-- through queued → sent → confirmed (or failed). Never deletes; refunds keep
-- the row with status='refunded' for audit.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE payout_status AS ENUM (
      'pending',     -- created but not yet picked up by the worker
      'queued',      -- worker has it but hasn't sent on-chain or to provider yet
      'sent',        -- on-chain or provider-side accepted; awaiting confirmation
      'confirmed',   -- on-chain confirmed or provider settled
      'failed',      -- terminal failure; manual review
      'refunded'     -- explicitly clawed back (rare)
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS agent_payouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id         uuid REFERENCES tasks(id) ON DELETE SET NULL,
  submission_id   uuid REFERENCES submissions(id) ON DELETE SET NULL,
  amount_cents    int  NOT NULL CHECK (amount_cents > 0),
  currency        text NOT NULL DEFAULT 'USD',
  payout_method   payout_method NOT NULL,
  payout_address  text,
  payout_chain    text,
  status          payout_status NOT NULL DEFAULT 'pending',
  txid            text,
  failure_count   int  NOT NULL DEFAULT 0,
  error_message   text,
  raw_provider_response jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  queued_at       timestamptz,
  sent_at         timestamptz,
  confirmed_at    timestamptz,
  refunded_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_agent_payouts_user_status
  ON agent_payouts (agent_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_payouts_open
  ON agent_payouts (status, created_at)
  WHERE status IN ('pending', 'queued', 'failed');

ALTER TABLE agent_payouts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'agent_payouts'
      AND policyname = 'agent_payouts_owner_select'
  ) THEN
    CREATE POLICY agent_payouts_owner_select ON agent_payouts
      FOR SELECT
      USING (agent_user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- ── 6. stake_charges table (D37 path A) ──────────────────────
-- One row per Coinbase Commerce charge created for "stake-to-bootstrap." On
-- charge:confirmed, an agent can claim the charge to mint their first key.
-- One charge maps to at most one user / api_key. The webhook handler must be
-- idempotent on `charge_id` (UNIQUE).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stake_charge_status') THEN
    CREATE TYPE stake_charge_status AS ENUM (
      'pending',    -- created, awaiting on-chain confirmation
      'confirmed',  -- Coinbase confirmed; available to claim
      'expired',    -- not paid in time
      'claimed',    -- redeemed for an api_key
      'refunded'    -- stake returned to payer (post-claim, on first qualifying submission)
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS stake_charges (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id          text NOT NULL UNIQUE,           -- Coinbase Commerce charge id
  amount_usdc        numeric(10,2) NOT NULL CHECK (amount_usdc > 0),
  status             stake_charge_status NOT NULL DEFAULT 'pending',
  claimed_user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  claimed_api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  refund_txid        text,
  raw_charge         jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  confirmed_at       timestamptz,
  claimed_at         timestamptz,
  refunded_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_stake_charges_status_created
  ON stake_charges (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stake_charges_claimed_user
  ON stake_charges (claimed_user_id)
  WHERE claimed_user_id IS NOT NULL;

ALTER TABLE stake_charges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stake_charges'
      AND policyname = 'stake_charges_owner_select'
  ) THEN
    CREATE POLICY stake_charges_owner_select ON stake_charges
      FOR SELECT
      USING (claimed_user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- ── 7. coinbase_webhook_events table (replay protection) ─────
-- Every Coinbase Commerce webhook lands here, keyed by event_id. The handler
-- INSERTs first; if the row exists, the event is a replay and rejected. F7.

CREATE TABLE IF NOT EXISTS coinbase_webhook_events (
  event_id    text PRIMARY KEY,
  event_type  text NOT NULL,
  charge_id   text,
  payload     jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coinbase_webhook_events_charge
  ON coinbase_webhook_events (charge_id, received_at DESC)
  WHERE charge_id IS NOT NULL;

-- (No RLS — service-role only; agents never see raw webhook events.)

-- ── 8. anonymous_register_log (rate limit + audit) ───────────
-- Every anonymous-tier register attempt lands here, accepted or rejected. The
-- rate-limit query reads recent rows by source_ip / fingerprint. Service role
-- only — agents don't inspect the log.

CREATE TABLE IF NOT EXISTS anonymous_register_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ip         inet NOT NULL,
  ua_fingerprint    text,
  user_id           uuid REFERENCES users(id) ON DELETE SET NULL,
  api_key_id        uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  rejected          boolean NOT NULL DEFAULT false,
  rejection_reason  text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anon_reg_log_ip_time
  ON anonymous_register_log (source_ip, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_anon_reg_log_fingerprint_time
  ON anonymous_register_log (ua_fingerprint, created_at DESC)
  WHERE ua_fingerprint IS NOT NULL;

COMMIT;
