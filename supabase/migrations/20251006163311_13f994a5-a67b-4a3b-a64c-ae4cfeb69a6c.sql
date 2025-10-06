-- Phase 2 & 3: Add contact blocking and message pinning support

-- Add blocked contacts table
CREATE TABLE IF NOT EXISTS public.blocked_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT,
  UNIQUE(user_id, blocked_user_id)
);

-- Enable RLS on blocked_contacts
ALTER TABLE public.blocked_contacts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own blocked contacts
CREATE POLICY "Users can manage their blocked contacts"
  ON public.blocked_contacts
  FOR ALL
  USING (auth.uid() = user_id);

-- Add pinned messages table for better performance
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, message_id)
);

-- Enable RLS on pinned_messages
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- Users can view pinned messages in their conversations
CREATE POLICY "Users can view pinned messages in their conversations"
  ON public.pinned_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = pinned_messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- Users can pin messages in their conversations
CREATE POLICY "Users can pin messages in their conversations"
  ON public.pinned_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = pinned_by
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = pinned_messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- Users can unpin messages
CREATE POLICY "Users can unpin messages"
  ON public.pinned_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = pinned_messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blocked_contacts_user_id ON public.blocked_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_contacts_blocked_user_id ON public.blocked_contacts(blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_conversation_id ON public.pinned_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_message_id ON public.pinned_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON public.calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_id ON public.calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON public.calls(started_at DESC);