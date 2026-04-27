
-- User-level token health flag for prevention of pointless retries
CREATE TABLE IF NOT EXISTS public.user_push_health (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  has_valid_token boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  invalid_token_count integer NOT NULL DEFAULT 0,
  consecutive_failures integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_push_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own push health"
  ON public.user_push_health FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all push health"
  ON public.user_push_health FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Service can manage push health"
  ON public.user_push_health FOR ALL
  USING (true) WITH CHECK (true);

-- Admin diagnostics RPC
CREATE OR REPLACE FUNCTION public.get_push_token_diagnostics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH all_users AS (
    SELECT p.id AS user_id, p.username, p.phone_number
    FROM profiles p
  ),
  token_summary AS (
    SELECT user_id, COUNT(*) AS token_count, MAX(last_used_at) AS last_token_used_at
    FROM device_tokens GROUP BY user_id
  ),
  failed_digests AS (
    SELECT user_id, COUNT(*) AS failed_count, MAX(last_attempt_at) AS last_failure
    FROM notifications
    WHERE type = 'digest_update'
      AND delivery_status IN ('failed','failed_permanent')
    GROUP BY user_id
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'users_with_no_token', (SELECT COUNT(*) FROM all_users u LEFT JOIN token_summary t ON t.user_id = u.user_id WHERE t.token_count IS NULL OR t.token_count = 0),
      'users_with_invalid_flag', (SELECT COUNT(*) FROM user_push_health WHERE has_valid_token = false),
      'users_with_failed_digests', (SELECT COUNT(*) FROM failed_digests),
      'total_failed_notifications', (SELECT COALESCE(SUM(failed_count),0) FROM failed_digests)
    ),
    'problem_users', COALESCE((
      SELECT jsonb_agg(row_to_jsonb(x)) FROM (
        SELECT
          u.user_id,
          u.username,
          u.phone_number,
          COALESCE(t.token_count, 0) AS token_count,
          t.last_token_used_at,
          COALESCE(h.has_valid_token, (t.token_count > 0)) AS has_valid_token,
          h.last_error,
          h.consecutive_failures,
          COALESCE(f.failed_count, 0) AS failed_digest_count,
          f.last_failure
        FROM all_users u
        LEFT JOIN token_summary t ON t.user_id = u.user_id
        LEFT JOIN user_push_health h ON h.user_id = u.user_id
        LEFT JOIN failed_digests f ON f.user_id = u.user_id
        WHERE COALESCE(t.token_count, 0) = 0
           OR COALESCE(h.has_valid_token, true) = false
           OR COALESCE(f.failed_count, 0) > 0
        ORDER BY COALESCE(f.failed_count, 0) DESC, COALESCE(h.consecutive_failures, 0) DESC
        LIMIT 200
      ) x
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
