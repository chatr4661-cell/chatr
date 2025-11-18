-- Create jobs tables for comprehensive job sourcing

-- 1. Jobs scraped from global sources (company websites, major portals)
CREATE TABLE IF NOT EXISTS public.jobs_scraped_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_website TEXT,
  job_type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  salary_range TEXT,
  experience_required TEXT,
  skills_required TEXT[],
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'company_website', 'job_portal', 'government', etc.
  location TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_remote BOOLEAN DEFAULT false,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Jobs scraped from local sources (college portals, local businesses)
CREATE TABLE IF NOT EXISTS public.jobs_scraped_local (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  job_type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  salary_range TEXT,
  experience_required TEXT,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'college_portal', 'placement_cell', 'municipal', etc.
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  pincode TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_remote BOOLEAN DEFAULT false,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. User-generated jobs (CHATR Network Effect)
CREATE TABLE IF NOT EXISTS public.jobs_user_generated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by UUID NOT NULL REFERENCES auth.users(id),
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_type TEXT, -- 'shop', 'salon', 'cafe', 'startup', etc.
  job_type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  salary_range TEXT,
  experience_required TEXT,
  skills_required TEXT[],
  contact_email TEXT,
  contact_phone TEXT,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  pincode TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  is_remote BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Master clean jobs table (merged from all sources)
CREATE TABLE IF NOT EXISTS public.jobs_clean_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL, -- 'global', 'local', 'user_generated'
  source_id UUID NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  salary_range TEXT,
  experience_required TEXT,
  skills_required TEXT[],
  contact_email TEXT,
  contact_phone TEXT,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  pincode TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  distance NUMERIC, -- calculated distance from user
  is_remote BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  source_url TEXT,
  posted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jobs_scraped_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_scraped_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_user_generated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_clean_master ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs_scraped_global
CREATE POLICY "Anyone can view global jobs"
  ON public.jobs_scraped_global
  FOR SELECT
  USING (true);

-- RLS Policies for jobs_scraped_local
CREATE POLICY "Anyone can view local jobs"
  ON public.jobs_scraped_local
  FOR SELECT
  USING (true);

-- RLS Policies for jobs_user_generated
CREATE POLICY "Anyone can view active user jobs"
  ON public.jobs_user_generated
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can create jobs"
  ON public.jobs_user_generated
  FOR INSERT
  WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Users can update their own jobs"
  ON public.jobs_user_generated
  FOR UPDATE
  USING (auth.uid() = posted_by);

CREATE POLICY "Users can delete their own jobs"
  ON public.jobs_user_generated
  FOR DELETE
  USING (auth.uid() = posted_by);

-- RLS Policies for jobs_clean_master
CREATE POLICY "Anyone can view master jobs"
  ON public.jobs_clean_master
  FOR SELECT
  USING (true);

-- Indexes for performance
CREATE INDEX idx_jobs_global_location ON public.jobs_scraped_global(city, state, pincode);
CREATE INDEX idx_jobs_global_category ON public.jobs_scraped_global(category);
CREATE INDEX idx_jobs_global_coords ON public.jobs_scraped_global(latitude, longitude);

CREATE INDEX idx_jobs_local_location ON public.jobs_scraped_local(city, state, pincode);
CREATE INDEX idx_jobs_local_category ON public.jobs_scraped_local(category);
CREATE INDEX idx_jobs_local_coords ON public.jobs_scraped_local(latitude, longitude);

CREATE INDEX idx_jobs_user_location ON public.jobs_user_generated(city, state, pincode);
CREATE INDEX idx_jobs_user_category ON public.jobs_user_generated(category);
CREATE INDEX idx_jobs_user_coords ON public.jobs_user_generated(latitude, longitude);
CREATE INDEX idx_jobs_user_active ON public.jobs_user_generated(is_active);
CREATE INDEX idx_jobs_user_posted_by ON public.jobs_user_generated(posted_by);

CREATE INDEX idx_jobs_master_location ON public.jobs_clean_master(city, state, pincode);
CREATE INDEX idx_jobs_master_category ON public.jobs_clean_master(category);
CREATE INDEX idx_jobs_master_coords ON public.jobs_clean_master(latitude, longitude);
CREATE INDEX idx_jobs_master_distance ON public.jobs_clean_master(distance);
CREATE INDEX idx_jobs_master_featured ON public.jobs_clean_master(is_featured);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_jobs_global_updated_at
  BEFORE UPDATE ON public.jobs_scraped_global
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_local_updated_at
  BEFORE UPDATE ON public.jobs_scraped_local
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_user_updated_at
  BEFORE UPDATE ON public.jobs_user_generated
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_master_updated_at
  BEFORE UPDATE ON public.jobs_clean_master
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();