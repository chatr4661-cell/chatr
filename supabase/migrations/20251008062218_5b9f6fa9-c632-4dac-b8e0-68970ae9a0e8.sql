-- Create stories table for WhatsApp-style status feature
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create their own stories"
  ON public.stories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view non-expired stories from their contacts"
  ON public.stories
  FOR SELECT
  USING (
    expires_at > now() AND (
      auth.uid() = user_id OR
      EXISTS (
        SELECT 1 FROM public.contacts
        WHERE contacts.user_id = auth.uid()
        AND contacts.contact_user_id = stories.user_id
        AND contacts.is_registered = true
      )
    )
  );

CREATE POLICY "Users can delete their own stories"
  ON public.stories
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_stories_expires_at ON public.stories(expires_at);