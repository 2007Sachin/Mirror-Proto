-- =============================================================================
-- MIRROR 001: per-user ownership (auth.users), owner-only RLS, and tables for
-- Replay, Story bank, Resume claims + JD gap matches, Spaced replay.
--
-- Target project : MIRROR (ref kiflaiepdjewkgqtaqvq), Postgres 17.
-- Status         : DRAFT. NOT APPLIED. Review, then apply on a branch first.
-- Written against the live schema read on 2026-11-15 (migrations up to
-- 20261111091354_0006_practice). Rollback: 001_auth_rls_and_new_features.rollback.sql
--
-- Naming: every new table is prefixed mirror_ because the project already has
-- legacy tables called public.answer_attempts and public.stories (older MIRROR
-- build, different columns, FKs to public.profiles). This file does not touch them.
--
-- Sections
--   A. Ownership columns, indexes, grants and owner-only RLS on existing tables
--   B. New feature tables (all owner-only RLS)
--   C. DEMO DATA MAPPING: 'dev' workspace -> one demo auth user (guarded, opt-in)
--   D. Tighten to NOT NULL (commented out; run only after the API writes user_id)
--
-- Privacy: nothing here stores audio. Replay keeps answer TEXT only.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- A0. Shared helper: keep updated_at fresh. SECURITY INVOKER, fixed search_path.
-- -----------------------------------------------------------------------------
create or replace function public.mirror_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- A1. user_id on every user-owned table.
--     Nullable for now so the current service-role API (which does not send a
--     user) keeps working and existing rows survive. Section D makes it NOT NULL.
--     default auth.uid(): a signed-in client insert is owned by its caller.
-- -----------------------------------------------------------------------------
alter table public.mirror_workspaces        add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.mirror_interviews        add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.mirror_turns             add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.mirror_reflections       add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.mirror_profiles          add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.mirror_targets           add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.mirror_practice_attempts add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

-- One workspace and one profile per user (NULLs are still allowed for legacy rows).
create unique index if not exists mirror_workspaces_user_id_key on public.mirror_workspaces (user_id);
create unique index if not exists mirror_profiles_user_id_key   on public.mirror_profiles (user_id);

-- -----------------------------------------------------------------------------
-- A2. Indexes: user_id (RLS filter + list queries) and the workspace FKs the
--     performance advisor flags as unindexed.
-- -----------------------------------------------------------------------------
create index if not exists mirror_interviews_user_created_idx        on public.mirror_interviews (user_id, created_at desc);
create index if not exists mirror_turns_user_id_idx                  on public.mirror_turns (user_id);
create index if not exists mirror_reflections_user_id_idx            on public.mirror_reflections (user_id);
create index if not exists mirror_targets_user_created_idx           on public.mirror_targets (user_id, created_at desc);
create index if not exists mirror_practice_attempts_user_created_idx on public.mirror_practice_attempts (user_id, created_at);

create index if not exists mirror_interviews_workspace_id_idx  on public.mirror_interviews (workspace_id);
create index if not exists mirror_turns_workspace_id_idx       on public.mirror_turns (workspace_id);
create index if not exists mirror_reflections_workspace_id_idx on public.mirror_reflections (workspace_id);
create index if not exists mirror_targets_workspace_id_idx     on public.mirror_targets (workspace_id);

-- -----------------------------------------------------------------------------
-- A3. Grants. Today anon AND authenticated hold ALL privileges (incl. TRUNCATE,
--     which RLS does not cover) on every mirror_ table. Anon gets nothing;
--     authenticated gets plain CRUD, which RLS then narrows to its own rows.
-- -----------------------------------------------------------------------------
revoke all on public.mirror_workspaces, public.mirror_interviews, public.mirror_turns,
              public.mirror_reflections, public.mirror_profiles, public.mirror_targets,
              public.mirror_practice_attempts
  from anon, authenticated;
grant select, insert, update, delete on public.mirror_workspaces, public.mirror_interviews, public.mirror_turns,
              public.mirror_reflections, public.mirror_profiles, public.mirror_targets,
              public.mirror_practice_attempts
  to authenticated;

-- -----------------------------------------------------------------------------
-- A4. Owner-only RLS. (select auth.uid()) is evaluated once per statement.
--     Child rows (turns, reflections) must also point at an interview the
--     caller owns, so a user cannot attach rows to someone else's interview.
-- -----------------------------------------------------------------------------
alter table public.mirror_workspaces        enable row level security;
alter table public.mirror_interviews        enable row level security;
alter table public.mirror_turns             enable row level security;
alter table public.mirror_reflections       enable row level security;
alter table public.mirror_profiles          enable row level security;
alter table public.mirror_targets           enable row level security;
alter table public.mirror_practice_attempts enable row level security;

-- Simple owner tables: workspaces, interviews, profiles, targets, practice attempts
do $$
declare t text;
begin
  foreach t in array array['mirror_workspaces','mirror_interviews','mirror_profiles','mirror_targets','mirror_practice_attempts'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t || '_owner_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t || '_owner_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_owner_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t || '_owner_delete', t);
  end loop;
end $$;

-- Children of an interview: turns, reflections
do $$
declare t text;
begin
  foreach t in array array['mirror_turns','mirror_reflections'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t || '_owner_select', t);
    execute format($p$create policy %I on public.%I for insert to authenticated with check (
        (select auth.uid()) = user_id
        and exists (select 1 from public.mirror_interviews i where i.id = interview_id and i.user_id = (select auth.uid())))$p$, t || '_owner_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check (
        (select auth.uid()) = user_id
        and exists (select 1 from public.mirror_interviews i where i.id = interview_id and i.user_id = (select auth.uid())))$p$, t || '_owner_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t || '_owner_delete', t);
  end loop;
end $$;

-- =============================================================================
-- B. NEW FEATURE TABLES
-- =============================================================================

-- B1. Replay: every attempt at an answer, TEXT ONLY (no audio, no audio URLs).
create table if not exists public.mirror_answer_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  interview_id     uuid references public.mirror_interviews(id) on delete set null,
  turn_id          uuid references public.mirror_turns(id) on delete set null,
  question_key     text not null check (char_length(question_key) between 1 and 200),  -- stable id: catalog question, practice item id, or pattern
  question         text not null check (char_length(question) between 1 and 1000),
  attempt_no       integer not null check (attempt_no >= 1),
  answer_text      text not null check (char_length(answer_text) between 1 and 10000),
  transcript_source text not null default 'text' check (transcript_source in ('text', 'voice')),
  duration_seconds integer check (duration_seconds between 0 and 3600),
  word_count       integer check (word_count >= 0),
  created_at       timestamptz not null default now(),
  unique (user_id, question_key, attempt_no)
);
comment on table public.mirror_answer_attempts is 'Replay: text of each attempt at a question. Never stores audio.';
create index if not exists mirror_answer_attempts_user_q_idx      on public.mirror_answer_attempts (user_id, question_key, created_at desc);
create index if not exists mirror_answer_attempts_interview_id_idx on public.mirror_answer_attempts (interview_id);
create index if not exists mirror_answer_attempts_turn_id_idx      on public.mirror_answer_attempts (turn_id);

-- B2. Story bank: STAR cards with themes.
create table if not exists public.mirror_stories (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title               text not null check (char_length(title) between 1 and 200),
  situation           text check (char_length(situation) <= 3000),
  task                text check (char_length(task) <= 3000),
  action              text check (char_length(action) <= 5000),
  result              text check (char_length(result) <= 3000),
  themes              text[] not null default '{}' check (cardinality(themes) <= 12),
  source              text not null default 'manual' check (source in ('manual', 'first_interview', 'interview')),
  source_interview_id uuid references public.mirror_interviews(id) on delete set null,
  archived_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists mirror_stories_user_updated_idx        on public.mirror_stories (user_id, updated_at desc) where archived_at is null;
create index if not exists mirror_stories_themes_gin             on public.mirror_stories using gin (themes);
create index if not exists mirror_stories_source_interview_id_idx on public.mirror_stories (source_interview_id);
drop trigger if exists mirror_stories_touch on public.mirror_stories;
create trigger mirror_stories_touch before update on public.mirror_stories
  for each row execute function public.mirror_touch_updated_at();

-- B3a. Resume claims: things the resume says, with the verbatim line they came from.
create table if not exists public.mirror_resume_claims (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  claim        text not null check (char_length(claim) between 1 and 500),
  category     text not null default 'other' check (category in ('skill', 'tool', 'project', 'impact', 'role', 'education', 'other')),
  source_quote text check (char_length(source_quote) <= 1000),
  resume_name  text check (char_length(resume_name) <= 200),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists mirror_resume_claims_user_idx on public.mirror_resume_claims (user_id, category);
drop trigger if exists mirror_resume_claims_touch on public.mirror_resume_claims;
create trigger mirror_resume_claims_touch before update on public.mirror_resume_claims
  for each row execute function public.mirror_touch_updated_at();

-- B3b. JD gap matches per target: each JD skill vs. what the resume backs up.
create table if not exists public.mirror_target_gap_matches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_id    uuid not null references public.mirror_targets(id) on delete cascade,
  skill_name   text not null check (char_length(skill_name) between 1 and 120),
  skill_weight text not null check (skill_weight in ('core', 'nice')),
  jd_quote     text check (char_length(jd_quote) <= 1000),
  claim_id     uuid references public.mirror_resume_claims(id) on delete set null,
  match_status text not null check (match_status in ('covered', 'partial', 'gap')),
  note         text check (char_length(note) <= 1000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (target_id, skill_name)
);
create index if not exists mirror_target_gap_matches_user_idx     on public.mirror_target_gap_matches (user_id);
create index if not exists mirror_target_gap_matches_claim_id_idx on public.mirror_target_gap_matches (claim_id);
drop trigger if exists mirror_target_gap_matches_touch on public.mirror_target_gap_matches;
create trigger mirror_target_gap_matches_touch before update on public.mirror_target_gap_matches
  for each row execute function public.mirror_touch_updated_at();

-- B4. Spaced replay schedule per question or pattern. Self-rated recall, never a score.
create table if not exists public.mirror_replay_schedule (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_kind        text not null check (item_kind in ('question', 'pattern', 'practice_item')),
  item_key         text not null check (char_length(item_key) between 1 and 200),
  track            text check (track in ('interview', 'sql', 'python', 'stats', 'case')),
  due_at           timestamptz not null default now(),
  interval_days    integer not null default 1 check (interval_days between 0 and 365),
  ease             numeric(3,2) not null default 2.50 check (ease between 1.30 and 3.00),
  repetitions      integer not null default 0 check (repetitions >= 0),
  last_recall      text check (last_recall in ('again', 'hard', 'good', 'easy')),
  last_reviewed_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, item_kind, item_key)
);
create index if not exists mirror_replay_schedule_due_idx on public.mirror_replay_schedule (user_id, due_at);
drop trigger if exists mirror_replay_schedule_touch on public.mirror_replay_schedule;
create trigger mirror_replay_schedule_touch before update on public.mirror_replay_schedule
  for each row execute function public.mirror_touch_updated_at();

-- B5. Grants + owner-only RLS on the new tables.
revoke all on public.mirror_answer_attempts, public.mirror_stories, public.mirror_resume_claims,
              public.mirror_target_gap_matches, public.mirror_replay_schedule
  from anon, authenticated;
grant select, insert, update, delete on public.mirror_answer_attempts, public.mirror_stories, public.mirror_resume_claims,
              public.mirror_target_gap_matches, public.mirror_replay_schedule
  to authenticated;

alter table public.mirror_answer_attempts    enable row level security;
alter table public.mirror_stories            enable row level security;
alter table public.mirror_resume_claims      enable row level security;
alter table public.mirror_target_gap_matches enable row level security;
alter table public.mirror_replay_schedule    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['mirror_stories','mirror_resume_claims','mirror_replay_schedule'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t || '_owner_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t || '_owner_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_owner_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t || '_owner_delete', t);
  end loop;
end $$;

-- Replay attempts: optional links must point at the caller's own interview / turn.
drop policy if exists mirror_answer_attempts_owner_select on public.mirror_answer_attempts;
drop policy if exists mirror_answer_attempts_owner_insert on public.mirror_answer_attempts;
drop policy if exists mirror_answer_attempts_owner_update on public.mirror_answer_attempts;
drop policy if exists mirror_answer_attempts_owner_delete on public.mirror_answer_attempts;
create policy mirror_answer_attempts_owner_select on public.mirror_answer_attempts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy mirror_answer_attempts_owner_insert on public.mirror_answer_attempts for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (interview_id is null or exists (select 1 from public.mirror_interviews i where i.id = interview_id and i.user_id = (select auth.uid())))
    and (turn_id is null or exists (select 1 from public.mirror_turns t where t.id = turn_id and t.user_id = (select auth.uid())))
  );
create policy mirror_answer_attempts_owner_update on public.mirror_answer_attempts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (interview_id is null or exists (select 1 from public.mirror_interviews i where i.id = interview_id and i.user_id = (select auth.uid())))
    and (turn_id is null or exists (select 1 from public.mirror_turns t where t.id = turn_id and t.user_id = (select auth.uid())))
  );
create policy mirror_answer_attempts_owner_delete on public.mirror_answer_attempts for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Gap matches: the target (and claim, if any) must be the caller's own.
drop policy if exists mirror_target_gap_matches_owner_select on public.mirror_target_gap_matches;
drop policy if exists mirror_target_gap_matches_owner_insert on public.mirror_target_gap_matches;
drop policy if exists mirror_target_gap_matches_owner_update on public.mirror_target_gap_matches;
drop policy if exists mirror_target_gap_matches_owner_delete on public.mirror_target_gap_matches;
create policy mirror_target_gap_matches_owner_select on public.mirror_target_gap_matches for select to authenticated
  using ((select auth.uid()) = user_id);
create policy mirror_target_gap_matches_owner_insert on public.mirror_target_gap_matches for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.mirror_targets g where g.id = target_id and g.user_id = (select auth.uid()))
    and (claim_id is null or exists (select 1 from public.mirror_resume_claims c where c.id = claim_id and c.user_id = (select auth.uid())))
  );
create policy mirror_target_gap_matches_owner_update on public.mirror_target_gap_matches for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.mirror_targets g where g.id = target_id and g.user_id = (select auth.uid()))
    and (claim_id is null or exists (select 1 from public.mirror_resume_claims c where c.id = claim_id and c.user_id = (select auth.uid())))
  );
create policy mirror_target_gap_matches_owner_delete on public.mirror_target_gap_matches for delete to authenticated
  using ((select auth.uid()) = user_id);

-- =============================================================================
-- C. DEMO DATA MAPPING  >>> OPT-IN, REVIEW BEFORE RUNNING <<<
--    Assigns every row of the shared 'dev' workspace to ONE existing auth user.
--    1) Create the demo user first in Dashboard > Authentication (not via SQL).
--    2) Replace the email below. While it is the placeholder, this block only
--       prints a notice and changes nothing.
--    Rows in the QA workspaces 'live-qa', 'intruder', 'phase2-voice-qa-4883'
--    are left unowned (invisible to every client). Delete them separately if wanted.
-- =============================================================================
do $$
declare
  demo_email constant text := 'REPLACE_WITH_DEMO_USER_EMAIL';
  demo_id uuid;
begin
  if demo_email = 'REPLACE_WITH_DEMO_USER_EMAIL' then
    raise notice 'Section C skipped: set demo_email to map the dev workspace.';
    return;
  end if;
  select id into demo_id from auth.users where lower(email) = lower(demo_email);
  if demo_id is null then
    raise exception 'Section C: no auth user with email %', demo_email;
  end if;
  if exists (select 1 from public.mirror_workspaces where user_id = demo_id and slug <> 'dev') then
    raise exception 'Section C: user % already owns another workspace', demo_email;
  end if;
  update public.mirror_workspaces        set user_id = demo_id where slug = 'dev';
  update public.mirror_interviews        set user_id = demo_id where workspace_id = 'dev' and user_id is null;
  update public.mirror_turns             set user_id = demo_id where workspace_id = 'dev' and user_id is null;
  update public.mirror_reflections       set user_id = demo_id where workspace_id = 'dev' and user_id is null;
  update public.mirror_profiles          set user_id = demo_id where workspace_id = 'dev' and user_id is null;
  update public.mirror_targets           set user_id = demo_id where workspace_id = 'dev' and user_id is null;
  update public.mirror_practice_attempts set user_id = demo_id where workspace_id = 'dev' and user_id is null;
  raise notice 'Section C: dev workspace mapped to %', demo_id;
end $$;

-- =============================================================================
-- D. TIGHTEN (DO NOT RUN YET). After the API sends a user on every write and the
--    leftover unowned rows are mapped or deleted, run in a follow-up migration:
--
-- alter table public.mirror_workspaces        alter column user_id set not null;
-- alter table public.mirror_interviews        alter column user_id set not null;
-- alter table public.mirror_turns             alter column user_id set not null;
-- alter table public.mirror_reflections       alter column user_id set not null;
-- alter table public.mirror_profiles          alter column user_id set not null;
-- alter table public.mirror_targets           alter column user_id set not null;
-- alter table public.mirror_practice_attempts alter column user_id set not null;
-- =============================================================================

commit;

notify pgrst, 'reload schema';
