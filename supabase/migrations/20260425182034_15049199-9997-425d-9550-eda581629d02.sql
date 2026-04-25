
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS digest_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS digest_categories jsonb DEFAULT jsonb_build_object(
    'wallet', true,
    'earnings', true,
    'referrals', true,
    'missions', true,
    'chats', true,
    'calls', true,
    'bookings', true,
    'food', true,
    'jobs', true,
    'wellness', true
  );

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'delivered',
  ADD COLUMN IF NOT EXISTS delivery_error text;

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON public.notifications (user_id, type, created_at DESC);
