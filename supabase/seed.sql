/**
 * Seed script for local development
 * Creates sample users, companies, agents, and tasks for testing
 *
 * Run this after migrations: psql -d map_dev -f seed.sql
 * Or via Supabase: supabase db push && supabase seed run
 */

-- WARNING: This only works locally. Do not run on production.
-- Bypass auth constraints for seeding
SET session_replication_role = 'replica';

-- ============================================================================
-- SAMPLE USERS
-- ============================================================================

-- Company user (email: company@example.com)
INSERT INTO auth.users (
  id, email, email_confirmed_at, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'company@example.com',
  NOW(),
  crypt('password', gen_salt('bf')),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, email, role, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'company@example.com', 'company', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Agent builder user (email: agent@example.com)
INSERT INTO auth.users (
  id, email, email_confirmed_at, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'agent@example.com',
  NOW(),
  crypt('password', gen_salt('bf')),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, email, role, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000002', 'agent@example.com', 'agent_builder', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Admin user (email: admin@example.com)
INSERT INTO auth.users (
  id, email, email_confirmed_at, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'admin@example.com',
  NOW(),
  crypt('password', gen_salt('bf')),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, email, role, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000003', 'admin@example.com', 'admin', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SAMPLE COMPANIES
-- ============================================================================

INSERT INTO public.companies (id, user_id, name, website, created_at, updated_at)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Acme Corp',
  'https://acme-corp.example.com',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- SAMPLE AGENT BUILDERS
-- ============================================================================

INSERT INTO public.agent_builders (
  id, user_id, display_name, bio, docker_image_url, categories, reputation_score, tasks_attempted, tasks_won, average_score, created_at, updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'CodeMaster',
  'Expert in code generation and optimization',
  'ghcr.io/example/codemaster:latest',
  ARRAY['code-generation', 'optimization'],
  85.5,
  5,
  2,
  87.3,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- SAMPLE TASKS
-- ============================================================================

INSERT INTO public.tasks (
  id,
  company_id,
  title,
  description,
  input_spec,
  output_spec,
  test_suite_url,
  rubric,
  test_weight,
  llm_weight,
  budget,
  deadline,
  status,
  created_at,
  updated_at
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Build a Todo List API',
  'Create a RESTful API for a todo list application with CRUD operations. The API should support creating, reading, updating, and deleting todos.',
  '{"framework": "node", "database": "postgres"}',
  '{"files": ["api.ts", "tests.ts"], "format": "typescript"}',
  'https://example-storage.s3.amazonaws.com/tests.zip',
  '{
    "criteria": [
      {
        "name": "Code Quality",
        "weight": 30,
        "description": "Is the code well-structured, readable, and maintainable?"
      },
      {
        "name": "Test Coverage",
        "weight": 20,
        "description": "Are critical paths tested?"
      },
      {
        "name": "API Design",
        "weight": 25,
        "description": "Is the API design RESTful and intuitive?"
      },
      {
        "name": "Documentation",
        "weight": 25,
        "description": "Is the code well-documented?"
      }
    ],
    "test_weight": 0.6,
    "llm_weight": 0.4
  }',
  0.6,
  0.4,
  '$5,000',
  NOW() + INTERVAL '7 days',
  'open',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- RE-ENABLE CONSTRAINTS
-- ============================================================================

SET session_replication_role = 'default';

-- ============================================================================
-- OUTPUT
-- ============================================================================

SELECT 'Seed data created successfully' as message;
SELECT COUNT(*) as user_count FROM public.users;
SELECT COUNT(*) as company_count FROM public.companies;
SELECT COUNT(*) as agent_count FROM public.agent_builders;
SELECT COUNT(*) as task_count FROM public.tasks;
