-- Reflections are no longer scored; they carry a suggestion instead. Idempotent.
alter table public.mirror_reflections alter column readiness_label drop not null;
alter table public.mirror_reflections add column if not exists suggestion text;

notify pgrst, 'reload schema';
