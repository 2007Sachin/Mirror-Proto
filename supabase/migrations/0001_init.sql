-- MIRROR Phase 1 schema (idempotent).
-- Candidate-data tables enable RLS. No broad anonymous public policies.
-- Repository operations are workspace-scoped in application code.
-- The service/secret key bypasses RLS; the anon key has no policies.

create table if not exists public.workspaces (
  slug text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(slug) on delete cascade,
  role text not null,
  industry text,
  status text not null default 'in_progress',
  asked_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.interviews add column if not exists asked_questions jsonb not null default '[]'::jsonb;

alter table public.interviews drop constraint if exists interviews_status_check;
alter table public.interviews
  add constraint interviews_status_check
  check (status in ('in_progress', 'completed', 'abandoned'));

create table if not exists public.turns (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(slug) on delete cascade,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  question_index integer not null check (question_index between 0 and 3),
  question text not null,
  answer text not null,
  transcript_source text not null default 'text' check (transcript_source in ('text', 'voice')),
  created_at timestamptz not null default now(),
  unique (interview_id, question_index)
);

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(slug) on delete cascade,
  interview_id uuid not null unique references public.interviews(id) on delete cascade,
  role text not null,
  readiness_label text not null check (readiness_label in ('emerging', 'solid', 'strong')),
  readiness_range jsonb,
  evidence jsonb not null default '[]'::jsonb,
  focus text not null,
  model text not null,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.interviews enable row level security;
alter table public.turns enable row level security;
alter table public.reflections enable row level security;

-- Intentionally no `anon` / `public` policies with using (true).
-- Phase 1 has no authentication; the server uses SUPABASE_SECRET_KEY.
