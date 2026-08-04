CREATE TABLE IF NOT EXISTS public.auth_exchange_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.auth_exchange_attempts TO service_role;

ALTER TABLE public.auth_exchange_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend only access to auth exchange attempts"
ON public.auth_exchange_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS auth_exchange_attempts_phone_time_idx
ON public.auth_exchange_attempts (phone_key, created_at DESC);