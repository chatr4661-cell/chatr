-- Remove all legacy jobs backend tables (replaced by external TalentXcel platform)
DROP TABLE IF EXISTS public.chatr_job_applications CASCADE;
DROP TABLE IF EXISTS public.chatr_jobs CASCADE;
DROP TABLE IF EXISTS public.job_alerts CASCADE;
DROP TABLE IF EXISTS public.job_applications CASCADE;
DROP TABLE IF EXISTS public.job_searches CASCADE;
DROP TABLE IF EXISTS public.jobs_clean_master CASCADE;
DROP TABLE IF EXISTS public.jobs_scraped_global CASCADE;
DROP TABLE IF EXISTS public.jobs_scraped_local CASCADE;
DROP TABLE IF EXISTS public.jobs_user_generated CASCADE;
DROP TABLE IF EXISTS public.local_jobs_db CASCADE;
DROP TABLE IF EXISTS public.saved_jobs CASCADE;