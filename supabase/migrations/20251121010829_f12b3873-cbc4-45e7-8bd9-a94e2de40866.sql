-- Allow jobs without an internal source record
ALTER TABLE public.jobs_clean_master
ALTER COLUMN source_id DROP NOT NULL;