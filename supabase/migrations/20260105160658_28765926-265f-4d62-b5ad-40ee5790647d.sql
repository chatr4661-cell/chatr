-- Create scheduled_notifications table for scheduled/recurring notifications
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ NOT NULL,
  recurring_frequency TEXT, -- 'daily', 'weekly', 'monthly'
  recurring_end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient querying of pending notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending 
ON public.scheduled_notifications(scheduled_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user 
ON public.scheduled_notifications(user_id);

-- Enable RLS
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own scheduled notifications
CREATE POLICY "Users can view their own scheduled notifications"
ON public.scheduled_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own scheduled notifications
CREATE POLICY "Users can create their own scheduled notifications"
ON public.scheduled_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scheduled notifications
CREATE POLICY "Users can update their own scheduled notifications"
ON public.scheduled_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own scheduled notifications
CREATE POLICY "Users can delete their own scheduled notifications"
ON public.scheduled_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_notifications_updated_at
BEFORE UPDATE ON public.scheduled_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications table if not already
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;