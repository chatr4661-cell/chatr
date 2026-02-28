
-- 1. Add analytics and outcome fields to calls table
ALTER TABLE public.calls
ADD COLUMN IF NOT EXISTS outcome_status TEXT CHECK (outcome_status IN ('resolved', 'follow_up', 'escalated', 'left_voicemail', 'missed_intent', 'spam', 'dropped')),
ADD COLUMN IF NOT EXISTS pre_call_intent TEXT CHECK (pre_call_intent IN ('urgent', 'casual', 'business', 'follow_up')),
ADD COLUMN IF NOT EXISTS user_feedback_score INTEGER CHECK (user_feedback_score >= 1 AND user_feedback_score <= 5),
ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS clarity_score NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS has_outcome_logged BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_calls_outcome_status ON public.calls(outcome_status) WHERE outcome_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_intent ON public.calls(pre_call_intent) WHERE pre_call_intent IS NOT NULL;

-- 2. call_summaries already exists — skipping creation

-- 3. Create contact_intelligence table
CREATE TABLE IF NOT EXISTS public.contact_intelligence (
    user_id UUID NOT NULL,
    contact_id TEXT NOT NULL,
    pickup_likelihood NUMERIC(3,2),
    optimal_call_window_start TIME,
    optimal_call_window_end TIME,
    preferred_route TEXT,
    volatility TEXT,
    drops_prevented_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, contact_id)
);

ALTER TABLE public.contact_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contact intelligence"
ON public.contact_intelligence FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own contact intelligence"
ON public.contact_intelligence FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact intelligence"
ON public.contact_intelligence FOR UPDATE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_contact_intelligence_user ON public.contact_intelligence(user_id);
