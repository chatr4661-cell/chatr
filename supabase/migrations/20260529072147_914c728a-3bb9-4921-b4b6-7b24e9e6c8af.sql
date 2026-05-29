-- AI Memory: durable memories extracted from calls
CREATE TABLE public.call_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  call_id UUID,
  peer_id UUID,
  peer_phone TEXT,
  memory_type TEXT NOT NULL DEFAULT 'fact',
  content TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 3,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'call',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for recall
CREATE INDEX idx_call_memories_user ON public.call_memories(user_id);
CREATE INDEX idx_call_memories_call ON public.call_memories(call_id);
CREATE INDEX idx_call_memories_peer ON public.call_memories(peer_id);
CREATE INDEX idx_call_memories_type ON public.call_memories(memory_type);

-- Data API access: auth-only table (all policies scope to auth.uid())
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_memories TO authenticated;
GRANT ALL ON public.call_memories TO service_role;

-- Enable RLS
ALTER TABLE public.call_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memories"
ON public.call_memories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memories"
ON public.call_memories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
ON public.call_memories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
ON public.call_memories FOR DELETE
USING (auth.uid() = user_id);

-- Timestamp trigger (reuse existing function if present, else create)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_call_memories_updated_at
BEFORE UPDATE ON public.call_memories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();