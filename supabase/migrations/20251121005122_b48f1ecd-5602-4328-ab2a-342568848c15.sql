-- Create saved_jobs table for users to bookmark jobs
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(user_id, job_id)
);

-- Create job_applications table to track user applications
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'applied',
  resume_url TEXT,
  cover_letter TEXT,
  application_notes TEXT,
  UNIQUE(user_id, job_id)
);

-- Create job_alerts table for job notifications
CREATE TABLE IF NOT EXISTS public.job_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  keywords TEXT NOT NULL,
  location TEXT,
  job_type TEXT,
  experience_level TEXT,
  min_salary INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_notified_at TIMESTAMP WITH TIME ZONE
);

-- Create job_searches table to track user searches
CREATE TABLE IF NOT EXISTS public.job_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  keywords TEXT NOT NULL,
  location TEXT,
  results_count INTEGER DEFAULT 0,
  sources_used JSONB,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_searches ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_jobs
CREATE POLICY "Users can view their own saved jobs"
  ON public.saved_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
  ON public.saved_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave jobs"
  ON public.saved_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for job_applications
CREATE POLICY "Users can view their own applications"
  ON public.job_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications"
  ON public.job_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their applications"
  ON public.job_applications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policies for job_alerts
CREATE POLICY "Users can view their own alerts"
  ON public.job_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create alerts"
  ON public.job_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their alerts"
  ON public.job_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their alerts"
  ON public.job_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for job_searches
CREATE POLICY "Users can view their own searches"
  ON public.job_searches FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create searches"
  ON public.job_searches FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX idx_job_applications_user_id ON public.job_applications(user_id);
CREATE INDEX idx_job_applications_status ON public.job_applications(status);
CREATE INDEX idx_job_alerts_user_id ON public.job_alerts(user_id);
CREATE INDEX idx_job_alerts_active ON public.job_alerts(is_active);
CREATE INDEX idx_job_searches_user_id ON public.job_searches(user_id);