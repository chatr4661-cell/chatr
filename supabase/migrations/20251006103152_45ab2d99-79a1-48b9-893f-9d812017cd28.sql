-- Create announcements table for admin to broadcast messages
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  target_audience TEXT DEFAULT 'all', -- all, consumers, providers
  delivery_method TEXT DEFAULT 'in_app' -- in_app, email, both
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admins can manage announcements
CREATE POLICY "Admins can manage announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- All authenticated users can view active announcements
CREATE POLICY "Users can view active announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (is_active = true);

-- Create announcement_reads table to track who has read announcements
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Users can mark announcements as read
CREATE POLICY "Users can mark announcements as read"
ON public.announcement_reads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own read status
CREATE POLICY "Users can view their read status"
ON public.announcement_reads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all read statuses
CREATE POLICY "Admins can view all read statuses"
ON public.announcement_reads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));