-- Add starred_messages table for per-user starring
CREATE TABLE IF NOT EXISTS public.starred_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  starred_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS on starred_messages
ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

-- Users can manage their own starred messages
CREATE POLICY "Users can manage their starred messages"
  ON public.starred_messages
  FOR ALL
  USING (auth.uid() = user_id);

-- Add message_reports table for reporting
CREATE TABLE IF NOT EXISTS public.message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'violence', 'other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on message_reports
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON public.message_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

-- Users can view their own reports
CREATE POLICY "Users can view their reports"
  ON public.message_reports
  FOR SELECT
  USING (auth.uid() = reported_by);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_starred_messages_user_id ON public.starred_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_starred_messages_message_id ON public.starred_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_starred_messages_conversation_id ON public.starred_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_message_id ON public.message_reports(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_status ON public.message_reports(status);

-- Add reply context to messages (in case not already added)
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS reply_to_message_content TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_sender_name TEXT;