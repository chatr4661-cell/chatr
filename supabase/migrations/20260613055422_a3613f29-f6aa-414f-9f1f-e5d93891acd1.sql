
-- ============================================================
-- 1. CONTACTS SYNC QUEUE (staging for uploaded hashed contacts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts_sync_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  consent_given BOOLEAN NOT NULL DEFAULT false,
  item_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT contacts_sync_queue_status_chk
    CHECK (status IN ('pending','processing','completed','failed'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_sync_queue_status
  ON public.contacts_sync_queue (status, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_contacts_sync_queue_user
  ON public.contacts_sync_queue (user_id);

GRANT SELECT, INSERT ON public.contacts_sync_queue TO authenticated;
GRANT ALL ON public.contacts_sync_queue TO service_role;

ALTER TABLE public.contacts_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own sync batches"
  ON public.contacts_sync_queue FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own sync batches"
  ON public.contacts_sync_queue FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. GLOBAL HASHED PHONEBOOK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts_hash (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  name_confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
  frequency INTEGER NOT NULL DEFAULT 0,
  trust_score INTEGER NOT NULL DEFAULT 0,
  is_business BOOLEAN NOT NULL DEFAULT false,
  is_spam BOOLEAN NOT NULL DEFAULT false,
  data_source TEXT NOT NULL DEFAULT 'crowdsourced',
  opt_out BOOLEAN NOT NULL DEFAULT false,
  last_enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_hash_frequency
  ON public.contacts_hash (frequency DESC);

GRANT SELECT ON public.contacts_hash TO authenticated;
GRANT ALL ON public.contacts_hash TO service_role;

ALTER TABLE public.contacts_hash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can look up phonebook"
  ON public.contacts_hash FOR SELECT TO authenticated
  USING (opt_out = false);

-- ============================================================
-- 3. NAME VOTES (internal; maintained by worker only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts_name_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_hash TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  name_display TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phone_hash, name_normalized)
);

CREATE INDEX IF NOT EXISTS idx_contacts_name_votes_hash
  ON public.contacts_name_votes (phone_hash);

GRANT ALL ON public.contacts_name_votes TO service_role;

ALTER TABLE public.contacts_name_votes ENABLE ROW LEVEL SECURITY;
-- No policies: only the security-definer worker (service_role) touches this table.

-- ============================================================
-- 4. OPT-OUT REGISTRY (DPDP compliance)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.phonebook_opt_outs (
  phone_hash TEXT NOT NULL PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.phonebook_opt_outs TO authenticated;
GRANT ALL ON public.phonebook_opt_outs TO service_role;

ALTER TABLE public.phonebook_opt_outs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can request opt-out"
  ON public.phonebook_opt_outs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 5. updated_at triggers
-- ============================================================
CREATE TRIGGER trg_contacts_hash_updated_at
  BEFORE UPDATE ON public.contacts_hash
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_contacts_name_votes_updated_at
  BEFORE UPDATE ON public.contacts_name_votes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 6. RECOMPUTE a single hash aggregate from its votes
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_contact_hash(p_phone_hash TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_top_name TEXT;
  v_top_votes INTEGER;
  v_total INTEGER;
  v_confidence NUMERIC(5,4);
  v_trust INTEGER;
BEGIN
  SELECT name_display, votes
    INTO v_top_name, v_top_votes
  FROM public.contacts_name_votes
  WHERE phone_hash = p_phone_hash
  ORDER BY votes DESC, updated_at DESC
  LIMIT 1;

  SELECT COALESCE(SUM(votes), 0) INTO v_total
  FROM public.contacts_name_votes
  WHERE phone_hash = p_phone_hash;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  v_confidence := ROUND((v_top_votes::NUMERIC / v_total)::NUMERIC, 4);
  v_trust := LEAST(100, v_total * 5);

  INSERT INTO public.contacts_hash (
    phone_hash, name, name_confidence, frequency, trust_score, last_enriched_at, updated_at
  )
  VALUES (
    p_phone_hash, v_top_name, v_confidence, v_total, v_trust, now(), now()
  )
  ON CONFLICT (phone_hash) DO UPDATE SET
    name = CASE WHEN public.contacts_hash.is_business THEN public.contacts_hash.name ELSE EXCLUDED.name END,
    name_confidence = EXCLUDED.name_confidence,
    frequency = EXCLUDED.frequency,
    trust_score = GREATEST(public.contacts_hash.trust_score, EXCLUDED.trust_score),
    last_enriched_at = now(),
    updated_at = now();
END;
$$;

-- ============================================================
-- 7. BACKGROUND WORKER: process the sync queue in batches
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_contacts_sync_queue(p_batch_size INTEGER DEFAULT 50)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row RECORD;
  v_item JSONB;
  v_hash TEXT;
  v_name TEXT;
  v_norm TEXT;
  v_processed INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT id, payload
    FROM public.contacts_sync_queue
    WHERE status = 'pending' AND consent_given = true
    ORDER BY created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.contacts_sync_queue SET status = 'processing' WHERE id = v_row.id;

    BEGIN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_row.payload)
      LOOP
        v_hash := NULLIF(trim(v_item->>'phone_hash'), '');
        v_name := NULLIF(trim(v_item->>'name'), '');
        CONTINUE WHEN v_hash IS NULL OR v_name IS NULL;

        -- Respect opt-outs (DPDP)
        IF EXISTS (SELECT 1 FROM public.phonebook_opt_outs WHERE phone_hash = v_hash) THEN
          CONTINUE;
        END IF;

        v_norm := lower(regexp_replace(v_name, '\s+', ' ', 'g'));

        INSERT INTO public.contacts_name_votes (phone_hash, name_normalized, name_display, votes)
        VALUES (v_hash, v_norm, v_name, 1)
        ON CONFLICT (phone_hash, name_normalized)
        DO UPDATE SET votes = public.contacts_name_votes.votes + 1, updated_at = now();

        PERFORM public.recompute_contact_hash(v_hash);
      END LOOP;

      UPDATE public.contacts_sync_queue
        SET status = 'completed', processed_at = now()
        WHERE id = v_row.id;
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.contacts_sync_queue
        SET status = 'failed', error = SQLERRM, processed_at = now()
        WHERE id = v_row.id;
    END;
  END LOOP;

  RETURN v_processed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_contacts_sync_queue(INTEGER) TO service_role;

-- ============================================================
-- 8. NAME CONFIDENCE LOOKUP (client-callable RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_name_confidence(p_phone_hash TEXT)
RETURNS TABLE(
  name TEXT,
  name_confidence NUMERIC,
  frequency INTEGER,
  trust_score INTEGER,
  is_business BOOLEAN,
  is_spam BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT name, name_confidence, frequency, trust_score, is_business, is_spam
  FROM public.contacts_hash
  WHERE phone_hash = p_phone_hash AND opt_out = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_name_confidence(TEXT) TO authenticated, anon;

-- Bulk lookup for a list of hashes (used to enrich a synced contact list)
CREATE OR REPLACE FUNCTION public.lookup_name_confidence_bulk(p_phone_hashes TEXT[])
RETURNS TABLE(
  phone_hash TEXT,
  name TEXT,
  name_confidence NUMERIC,
  frequency INTEGER,
  trust_score INTEGER,
  is_business BOOLEAN,
  is_spam BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT phone_hash, name, name_confidence, frequency, trust_score, is_business, is_spam
  FROM public.contacts_hash
  WHERE phone_hash = ANY(p_phone_hashes) AND opt_out = false;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_name_confidence_bulk(TEXT[]) TO authenticated;

-- ============================================================
-- 9. OPT-OUT RPC (DPDP right to be forgotten)
-- ============================================================
CREATE OR REPLACE FUNCTION public.phonebook_opt_out(p_phone_hash TEXT, p_reason TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.phonebook_opt_outs (phone_hash, reason)
  VALUES (p_phone_hash, p_reason)
  ON CONFLICT (phone_hash) DO NOTHING;

  UPDATE public.contacts_hash SET opt_out = true, updated_at = now()
  WHERE phone_hash = p_phone_hash;

  DELETE FROM public.contacts_name_votes WHERE phone_hash = p_phone_hash;
END;
$$;

GRANT EXECUTE ON FUNCTION public.phonebook_opt_out(TEXT, TEXT) TO authenticated;

-- ============================================================
-- 10. BUSINESS SEEDING RPC (cold-start)
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_business_number(
  p_phone_hash TEXT,
  p_name TEXT,
  p_trust INTEGER DEFAULT 90
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.contacts_hash (
    phone_hash, name, name_confidence, frequency, trust_score,
    is_business, data_source, last_enriched_at
  )
  VALUES (
    p_phone_hash, p_name, 1.0, 1, GREATEST(0, LEAST(100, p_trust)),
    true, 'business_seed', now()
  )
  ON CONFLICT (phone_hash) DO UPDATE SET
    name = EXCLUDED.name,
    is_business = true,
    name_confidence = 1.0,
    trust_score = GREATEST(public.contacts_hash.trust_score, EXCLUDED.trust_score),
    data_source = 'business_seed',
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_business_number(TEXT, TEXT, INTEGER) TO service_role;

-- ============================================================
-- 11. SCHEDULE THE 5-MINUTE BACKGROUND WORKER
-- ============================================================
DO $$
BEGIN
  PERFORM cron.unschedule('process-contact-syncs');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'process-contact-syncs',
  '*/5 * * * *',
  $cron$ SELECT public.process_contacts_sync_queue(100); $cron$
);
