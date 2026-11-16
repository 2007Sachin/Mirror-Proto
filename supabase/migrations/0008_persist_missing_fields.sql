-- =============================================================================
-- MIRROR 002: persist fields that feat/auth currently drops in Supabase mode.
--
-- Target project : MIRROR (ref kiflaiepdjewkgqtaqvq), Postgres 17.
-- Status         : APPLIED to live as 0008_persist_missing_fields on 2026-11-16.
--                  until reviewed. Rollback: 002_persist_missing_fields.rollback.sql
-- Written against the live schema read on 2026-11-16 (Asia/Calcutta), after
-- 001_auth_rls_and_new_features.sql.
--
-- Adds nullable columns (and one array with a default) so the app can store:
--   mirror_stories            quote, question, source_turn_id
--   mirror_target_gap_matches probe_question, area, source
--   mirror_resume_claims      skills, has_number, is_vague
--   mirror_answer_attempts    kind, item_id
--
-- Does not change grants, RLS policies, or check-constraint enums on existing
-- columns. Length checks on new text columns follow the style of 001.
--
-- Backfill of kind/item_id from question_key is skipped: mirror_answer_attempts
-- is empty on the live project, and no stable question_key format was observed.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- mirror_stories: verbatim quote, the question that produced it, and the turn.
-- -----------------------------------------------------------------------------
alter table public.mirror_stories
  add column if not exists quote text
    check (char_length(quote) <= 3000),
  add column if not exists question text
    check (char_length(question) <= 1000),
  add column if not exists source_turn_id uuid
    references public.mirror_turns(id) on delete set null;

create index if not exists mirror_stories_source_turn_id_idx
  on public.mirror_stories (source_turn_id);

-- -----------------------------------------------------------------------------
-- mirror_target_gap_matches: probe question, skill area, and where the match
-- came from. area/source are left unconstrained: the app's SkillArea is
-- ('sql','python','tools','analytics','behavioural'), but feat/auth's allowed
-- sets were not probed on this branch, so no new enum CHECKs are added.
-- -----------------------------------------------------------------------------
alter table public.mirror_target_gap_matches
  add column if not exists probe_question text
    check (char_length(probe_question) <= 1000),
  add column if not exists area text
    check (char_length(area) <= 120),
  add column if not exists source text
    check (char_length(source) <= 120);

-- -----------------------------------------------------------------------------
-- mirror_resume_claims: skills cited on the claim, plus number/vagueness flags.
-- skills is NOT NULL with a default, matching themes on mirror_stories.
-- -----------------------------------------------------------------------------
alter table public.mirror_resume_claims
  add column if not exists skills text[] not null default '{}',
  add column if not exists has_number boolean,
  add column if not exists is_vague boolean;

-- -----------------------------------------------------------------------------
-- mirror_answer_attempts: kind and item_id as first-class columns, instead of
-- encoding them inside question_key. Both nullable; no enum CHECK on kind.
-- -----------------------------------------------------------------------------
alter table public.mirror_answer_attempts
  add column if not exists kind text
    check (char_length(kind) <= 40),
  add column if not exists item_id text
    check (char_length(item_id) <= 200);

-- Backfill skipped: select count(*) from mirror_answer_attempts is 0, and
-- question_key values therefore have no observed format to parse.

commit;

notify pgrst, 'reload schema';
