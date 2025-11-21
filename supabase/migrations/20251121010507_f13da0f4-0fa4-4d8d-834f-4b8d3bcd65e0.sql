-- Add missing apply_url column to jobs_clean_master table
ALTER TABLE jobs_clean_master 
ADD COLUMN IF NOT EXISTS apply_url TEXT DEFAULT '#';