-- Variable-length interviews (a realistic screening call asks 5 to 8 questions).
--
-- APPLY THIS FILE, THEN SET SCREEN_DB_READY=1 on the server.
-- Until it is applied and the flag is set, the server caps a screen at 4 questions
-- and keeps its metadata in memory, so nothing breaks if you wait.
--
-- Idempotent: safe to run more than once.

-- 1. question_index may now go up to 11. The old check was created inline in 0001, so its
--    generated name can differ; find it by what it says rather than by name.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.mirror_turns'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%question_index%'
  loop
    execute format('alter table public.mirror_turns drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.mirror_turns
  add constraint mirror_turns_question_index_check check (question_index between 0 and 11);

-- 2. Screen metadata on the interview.
alter table public.mirror_interviews
  add column if not exists kind text not null default 'practice' check (kind in ('practice', 'screen'));
alter table public.mirror_interviews add column if not exists question_cap int;
alter table public.mirror_interviews add column if not exists time_cap_seconds int;
alter table public.mirror_interviews add column if not exists started_at timestamptz;
alter table public.mirror_interviews
  add column if not exists target_id uuid references public.mirror_targets(id) on delete set null;

notify pgrst, 'reload schema';

-- Applied to live as 0009_variable_length_interviews on 2026-11-16 (plus index below).
create index if not exists mirror_interviews_target_id_idx on public.mirror_interviews (target_id);
