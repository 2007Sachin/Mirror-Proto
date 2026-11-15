-- The Loop: a target (company + role + job description) with what Scout built from it.
create table if not exists public.mirror_targets (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.mirror_workspaces(slug) on delete cascade,
  company text not null,
  role text not null,
  interview_date text,
  jd text not null,
  status text not null default 'scouting' check (status in ('scouting', 'ready')),
  skills jsonb not null default '[]'::jsonb,
  rounds jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  debriefs jsonb not null default '[]'::jsonb,
  next_step text,
  created_at timestamptz not null default now()
);

alter table public.mirror_targets enable row level security;

notify pgrst, 'reload schema';
