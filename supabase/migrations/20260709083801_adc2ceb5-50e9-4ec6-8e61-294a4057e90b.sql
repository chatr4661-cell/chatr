CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_id text NOT NULL,
  session_name text,

  -- Core Message History
  messages jsonb DEFAULT '[]'::jsonb,
  summary text,
  context_tokens integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  model_used text,

  -- 6-Layer Reasoning Metadata
  goals jsonb DEFAULT '[]'::jsonb,
  open_tasks jsonb DEFAULT '[]'::jsonb,
  entities jsonb DEFAULT '[]'::jsonb,
  topics jsonb DEFAULT '[]'::jsonb,
  mood text,
  pinned_context text,
  workspace_state jsonb DEFAULT '{}'::jsonb,
  memory_references jsonb DEFAULT '[]'::jsonb,

  -- Timestamps
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_sessions TO authenticated;
GRANT ALL ON public.agent_sessions TO service_role;

ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agent sessions"
  ON public.agent_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_id ON public.agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_id ON public.agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_last_active ON public.agent_sessions(last_active_at DESC);

CREATE OR REPLACE FUNCTION public.update_agent_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_agent_sessions_updated_at
BEFORE UPDATE ON public.agent_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_agent_sessions_updated_at();