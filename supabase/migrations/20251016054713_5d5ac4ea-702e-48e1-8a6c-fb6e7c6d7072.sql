-- Create symptom_checks table
CREATE TABLE IF NOT EXISTS public.symptom_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symptoms TEXT[] NOT NULL,
  ai_assessment TEXT NOT NULL,
  severity_level TEXT NOT NULL,
  recommended_actions TEXT[],
  specialist_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.symptom_checks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own symptom checks"
  ON public.symptom_checks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create symptom checks"
  ON public.symptom_checks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_symptom_checks_user_id ON public.symptom_checks(user_id);
CREATE INDEX idx_symptom_checks_created_at ON public.symptom_checks(created_at DESC);