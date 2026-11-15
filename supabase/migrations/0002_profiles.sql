-- The First Interview: what the agent learned about the candidate (one row per workspace).
create table if not exists public.mirror_profiles (
  workspace_id text primary key references public.mirror_workspaces(slug) on delete cascade,
  role text not null,
  story text not null,
  pressure_question text not null,
  pressure_answer text not null,
  summary text not null,
  focus text not null,
  first_question text not null,
  resume_text text,
  mode text not null default 'text' check (mode in ('text', 'voice')),
  created_at timestamptz not null default now()
);

alter table public.mirror_profiles enable row level security;

notify pgrst, 'reload schema';
