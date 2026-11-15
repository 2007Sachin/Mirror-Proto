-- Practice hub: one row per submitted answer in a practice drill.
create table if not exists public.mirror_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.mirror_workspaces(slug) on delete cascade,
  item_id text not null,
  track text not null check (track in ('sql', 'python', 'stats', 'case')),
  topic text not null,
  level int not null check (level between 1 and 3),
  correct boolean not null,
  seconds int not null default 0,
  hints_used int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists mirror_practice_attempts_ws_created_idx
  on public.mirror_practice_attempts (workspace_id, created_at);

alter table public.mirror_practice_attempts enable row level security;

notify pgrst, 'reload schema';
