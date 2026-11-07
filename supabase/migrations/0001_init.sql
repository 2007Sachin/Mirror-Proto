-- MIRROR Phase 1: initial schema.
-- All tables carry workspace_id; Phase 2 adds auth and RLS policies that
-- scope every query to the caller's workspace.

create table if not exists public.workspaces (
  slug text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(slug) on delete cascade,
  role text not null,
  industry text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz not null default now()
);

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

-- Phase 2 RLS pattern (to be added when auth lands):
--   create policy "workspace_isolation" on public.interviews
--     for all using (workspace_id = (auth.jwt() ->> 'workspace'))
--     with check (workspace_id = (auth.jwt() ->> 'workspace'));
-- Same shape applies to turns / reflections (and workspaces keyed by slug).
-- Broad anon policies (using (true)) are intentionally NOT created.

alter table public.workspaces enable row level security;
alter table public.interviews enable row level security;
alter table public.turns enable row level security;
alter table public.reflections enable row level security;
