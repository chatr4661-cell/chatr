-- ============================================================
-- GSM AI PIPELINE MIGRATION
-- ============================================================

-- 1. AI Rep Sessions Table
CREATE TABLE IF NOT EXISTS public.ai_rep_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  call_id TEXT,
  caller_number TEXT NOT NULL,
  caller_name TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'user_intervened', 'failed')),
  transcript JSONB DEFAULT '[]'::jsonb NOT NULL,
  fsm_context JSONB DEFAULT '{}'::jsonb NOT NULL,
  summary TEXT,
  one_line_summary TEXT,
  urgency TEXT DEFAULT 'normal'
    CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  caller_purpose TEXT,
  extracted_actions JSONB DEFAULT '[]'::jsonb NOT NULL,
  suggested_reply TEXT,
  follow_up_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  user_action TEXT CHECK (user_action IN ('called_back', 'sent_message', 'dismissed', 'scheduled', 'acted') OR user_action IS NULL),
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ai_rep_sessions_user_id ON public.ai_rep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_rep_sessions_caller ON public.ai_rep_sessions(caller_number);
CREATE INDEX IF NOT EXISTS idx_ai_rep_sessions_unreviewed ON public.ai_rep_sessions(user_id) WHERE reviewed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_rep_sessions_started ON public.ai_rep_sessions(started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_rep_sessions TO authenticated;
GRANT ALL ON public.ai_rep_sessions TO service_role;

ALTER TABLE public.ai_rep_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own rep sessions"
ON public.ai_rep_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Pre-call Context Cache Table
CREATE TABLE IF NOT EXISTS public.call_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  caller_number TEXT NOT NULL,
  context_json JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes') NOT NULL,
  UNIQUE(user_id, caller_number)
);

CREATE INDEX IF NOT EXISTS idx_call_context_cache_lookup ON public.call_context_cache(user_id, caller_number);
CREATE INDEX IF NOT EXISTS idx_call_context_cache_expiry ON public.call_context_cache(expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_context_cache TO authenticated;
GRANT ALL ON public.call_context_cache TO service_role;

ALTER TABLE public.call_context_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own context cache"
ON public.call_context_cache FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. CCE Sessions Table
CREATE TABLE IF NOT EXISTS public.cce_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  initiator_id UUID REFERENCES auth.users(id),
  peer_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMPTZ,
  transport_history JSONB DEFAULT '[]'::jsonb NOT NULL,
  final_transport TEXT,
  total_handoffs INTEGER DEFAULT 0,
  avg_quality FLOAT,
  min_quality FLOAT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_cce_sessions_session_id ON public.cce_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_cce_sessions_initiator ON public.cce_sessions(initiator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cce_sessions TO authenticated;
GRANT ALL ON public.cce_sessions TO service_role;

ALTER TABLE public.cce_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can access"
ON public.cce_sessions FOR ALL
USING (auth.uid() = initiator_id OR auth.uid() = peer_id)
WITH CHECK (auth.uid() = initiator_id OR auth.uid() = peer_id);

-- 4. Pre-call Decision Rules
CREATE TABLE IF NOT EXISTS public.precall_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  condition_json JSONB NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'screen_with_ai', 'send_to_voicemail', 'auto_block', 'alert_user')),
  priority INTEGER DEFAULT 50,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_precall_rules_user ON public.precall_rules(user_id) WHERE enabled = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.precall_rules TO authenticated;
GRANT ALL ON public.precall_rules TO service_role;

ALTER TABLE public.precall_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own rules"
ON public.precall_rules FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at (hardened search_path)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_precall_rules_updated_at ON public.precall_rules;
CREATE TRIGGER update_precall_rules_updated_at
  BEFORE UPDATE ON public.precall_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clean up expired cache (hardened search_path)
CREATE OR REPLACE FUNCTION public.cleanup_expired_context_cache()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.call_context_cache WHERE expires_at < NOW();
END;
$$;