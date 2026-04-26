ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_notifications_retry_due
  ON public.notifications (next_retry_at)
  WHERE delivery_status = 'failed' AND next_retry_at IS NOT NULL;