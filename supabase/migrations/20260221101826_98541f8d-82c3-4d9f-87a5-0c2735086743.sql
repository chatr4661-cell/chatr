
-- 1. Call Transcriptions table (used by live-transcription edge function)
CREATE TABLE public.call_transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id TEXT NOT NULL,
  text TEXT NOT NULL,
  confidence NUMERIC(4,3) DEFAULT 0.95,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  language TEXT DEFAULT 'en',
  speaker_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_transcriptions_call_id ON public.call_transcriptions(call_id);
CREATE INDEX idx_call_transcriptions_timestamp ON public.call_transcriptions(timestamp);

ALTER TABLE public.call_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert transcriptions"
  ON public.call_transcriptions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read transcriptions"
  ON public.call_transcriptions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Call Summaries table (used by call-summary edge function)
CREATE TABLE public.call_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  summary TEXT NOT NULL DEFAULT '',
  key_points JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  topics JSONB DEFAULT '[]'::jsonb,
  sentiment TEXT DEFAULT 'neutral',
  sentiment_history JSONB DEFAULT '[]'::jsonb,
  follow_up_required BOOLEAN DEFAULT false,
  next_steps JSONB DEFAULT '[]'::jsonb,
  transcript TEXT,
  trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  is_scam BOOLEAN DEFAULT false,
  duration_seconds INTEGER,
  participants JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_summaries_call_id ON public.call_summaries(call_id);
CREATE INDEX idx_call_summaries_user_id ON public.call_summaries(user_id);
CREATE INDEX idx_call_summaries_is_scam ON public.call_summaries(is_scam) WHERE is_scam = true;

ALTER TABLE public.call_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own summaries"
  ON public.call_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert summaries"
  ON public.call_summaries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own summaries"
  ON public.call_summaries FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Trust Graph (powers Identity Pulsar & relationship badges)
CREATE TABLE public.trust_graph (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  relationship_type TEXT DEFAULT 'contact',
  trust_level INTEGER DEFAULT 50 CHECK (trust_level >= 0 AND trust_level <= 100),
  interaction_count INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  badge TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_user_id, target_user_id)
);

CREATE INDEX idx_trust_graph_source ON public.trust_graph(source_user_id);
CREATE INDEX idx_trust_graph_target ON public.trust_graph(target_user_id);
CREATE INDEX idx_trust_graph_trust_level ON public.trust_graph(trust_level);

ALTER TABLE public.trust_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own trust graph"
  ON public.trust_graph FOR SELECT
  USING (auth.uid() = source_user_id OR auth.uid() = target_user_id);

CREATE POLICY "Authenticated users can insert trust edges"
  ON public.trust_graph FOR INSERT
  WITH CHECK (auth.uid() = source_user_id);

CREATE POLICY "Users can update their own trust edges"
  ON public.trust_graph FOR UPDATE
  USING (auth.uid() = source_user_id);

-- 4. Identity Scores (aggregated trust per user)
CREATE TABLE public.identity_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  overall_score INTEGER DEFAULT 50 CHECK (overall_score >= 0 AND overall_score <= 100),
  verification_level TEXT DEFAULT 'basic',
  total_interactions INTEGER DEFAULT 0,
  scam_flags INTEGER DEFAULT 0,
  trusted_by_count INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_identity_scores_user_id ON public.identity_scores(user_id);
CREATE INDEX idx_identity_scores_overall ON public.identity_scores(overall_score);

ALTER TABLE public.identity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read identity scores"
  ON public.identity_scores FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their score"
  ON public.identity_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own score"
  ON public.identity_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Trigger for updated_at on new tables
CREATE TRIGGER update_call_summaries_updated_at
  BEFORE UPDATE ON public.call_summaries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_trust_graph_updated_at
  BEFORE UPDATE ON public.trust_graph
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_identity_scores_updated_at
  BEFORE UPDATE ON public.identity_scores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Enable realtime for call_transcriptions (live transcription feed)
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_transcriptions;
