-- Create app_usage_sessions table to track time spent in apps
CREATE TABLE IF NOT EXISTS public.app_usage_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  app_id UUID NOT NULL REFERENCES public.mini_apps(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_usage_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own usage sessions"
ON public.app_usage_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their usage sessions"
ON public.app_usage_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their usage sessions"
ON public.app_usage_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_app_usage_sessions_user_id ON public.app_usage_sessions(user_id);
CREATE INDEX idx_app_usage_sessions_app_id ON public.app_usage_sessions(app_id);
CREATE INDEX idx_app_usage_sessions_dates ON public.app_usage_sessions(session_start, session_end);

-- Function to calculate duration when session ends
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_end IS NOT NULL AND NEW.session_start IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate duration
CREATE TRIGGER calculate_duration_on_update
BEFORE UPDATE ON public.app_usage_sessions
FOR EACH ROW
EXECUTE FUNCTION calculate_session_duration();