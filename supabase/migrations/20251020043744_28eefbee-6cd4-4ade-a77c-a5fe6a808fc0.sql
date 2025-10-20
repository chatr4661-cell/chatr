-- Add forwarding and media thumbnail fields to messages table
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS media_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS original_message_id UUID REFERENCES public.messages(id);