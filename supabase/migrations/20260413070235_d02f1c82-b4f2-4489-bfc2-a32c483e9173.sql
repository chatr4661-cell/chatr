-- Identity keys (long-term, like Signal's Identity Key)
CREATE TABLE public.e2e_identity_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  identity_public_key TEXT NOT NULL,
  signed_prekey_public TEXT NOT NULL,
  signed_prekey_signature TEXT NOT NULL,
  signed_prekey_id INTEGER NOT NULL DEFAULT 0,
  registration_id INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.e2e_identity_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own identity keys"
  ON public.e2e_identity_keys FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read public identity keys"
  ON public.e2e_identity_keys FOR SELECT
  TO authenticated
  USING (true);

-- One-time pre-keys (Signal X3DH)
CREATE TABLE public.e2e_prekeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prekey_id INTEGER NOT NULL,
  public_key TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, prekey_id)
);

ALTER TABLE public.e2e_prekeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own prekeys"
  ON public.e2e_prekeys FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read unused prekeys for session setup"
  ON public.e2e_prekeys FOR SELECT
  TO authenticated
  USING (is_used = false);

-- Encrypted sessions (Double Ratchet state)
CREATE TABLE public.e2e_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  peer_id UUID NOT NULL,
  session_state TEXT NOT NULL,
  root_key TEXT,
  chain_key TEXT,
  message_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, peer_id)
);

ALTER TABLE public.e2e_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions"
  ON public.e2e_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Atomic prekey consumption
CREATE OR REPLACE FUNCTION public.consume_prekey(p_target_user_id UUID)
RETURNS TABLE(prekey_id INTEGER, public_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prekey_id INTEGER;
  v_public_key TEXT;
  v_pk_uuid UUID;
BEGIN
  SELECT ep.id, ep.prekey_id, ep.public_key
  INTO v_pk_uuid, v_prekey_id, v_public_key
  FROM e2e_prekeys ep
  WHERE ep.user_id = p_target_user_id AND ep.is_used = false
  ORDER BY ep.prekey_id ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_pk_uuid IS NULL THEN
    RAISE EXCEPTION 'No prekeys available for this user';
  END IF;

  UPDATE e2e_prekeys SET is_used = true, used_by = auth.uid(), used_at = now()
  WHERE id = v_pk_uuid;

  RETURN QUERY SELECT v_prekey_id, v_public_key;
END;
$$;

CREATE INDEX idx_e2e_prekeys_available ON public.e2e_prekeys(user_id, is_used) WHERE is_used = false;
CREATE INDEX idx_e2e_sessions_peer ON public.e2e_sessions(user_id, peer_id);