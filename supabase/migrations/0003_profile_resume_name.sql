-- The Overview shows the resume's file name. Idempotent; run after 0002_profiles.sql.
alter table public.mirror_profiles add column if not exists resume_name text;

notify pgrst, 'reload schema';
