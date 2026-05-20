
CREATE TABLE public.job_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  posted_by UUID NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  location TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full-time',
  category TEXT,
  is_remote BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  applications_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL,
  cover_letter TEXT,
  resume_url TEXT,
  expected_salary INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  employer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

CREATE TABLE public.job_saved (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_saved ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active jobs are viewable by everyone" ON public.job_listings FOR SELECT USING (is_active = true OR posted_by = auth.uid());
CREATE POLICY "Users can post jobs" ON public.job_listings FOR INSERT WITH CHECK (auth.uid() = posted_by);
CREATE POLICY "Posters can update own jobs" ON public.job_listings FOR UPDATE USING (auth.uid() = posted_by);
CREATE POLICY "Posters can delete own jobs" ON public.job_listings FOR DELETE USING (auth.uid() = posted_by);

CREATE POLICY "Applicants and employers can view applications" ON public.job_applications FOR SELECT USING (
  auth.uid() = applicant_id OR auth.uid() IN (SELECT posted_by FROM public.job_listings WHERE id = job_id)
);
CREATE POLICY "Users can apply to jobs" ON public.job_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Applicant or employer can update application" ON public.job_applications FOR UPDATE USING (
  auth.uid() = applicant_id OR auth.uid() IN (SELECT posted_by FROM public.job_listings WHERE id = job_id)
);
CREATE POLICY "Applicants can withdraw" ON public.job_applications FOR DELETE USING (auth.uid() = applicant_id);

CREATE POLICY "Users manage own saved jobs" ON public.job_saved FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_job_listings_updated_at BEFORE UPDATE ON public.job_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.increment_job_applications_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.job_listings SET applications_count = applications_count + 1 WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_job_applications AFTER INSERT ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.increment_job_applications_count();

CREATE INDEX idx_job_listings_active ON public.job_listings(is_active, created_at DESC);
CREATE INDEX idx_job_listings_posted_by ON public.job_listings(posted_by);
CREATE INDEX idx_job_applications_job ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant ON public.job_applications(applicant_id);
