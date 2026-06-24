-- Migration: DPDP-compliant crowdsourcing for Caller ID

-- 1. Create DPDP Opt Outs Table
CREATE TABLE IF NOT EXISTS public.dpdp_opt_outs (
    hashed_number TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Write-Path Aggregation Tables
CREATE TABLE IF NOT EXISTS public.contact_label_frequencies (
    hashed_number TEXT NOT NULL,
    normalized_label TEXT NOT NULL,
    frequency_count INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (hashed_number, normalized_label)
);

CREATE TABLE IF NOT EXISTS public.contact_label_votes (
    hashed_number TEXT NOT NULL,
    normalized_label TEXT NOT NULL,
    hashed_uploader TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (hashed_number, normalized_label, hashed_uploader)
);

CREATE INDEX IF NOT EXISTS idx_contact_label_frequencies_hashed ON public.contact_label_frequencies(hashed_number);

-- GRANTs (required on Lovable Cloud). Written by service-role edge functions;
-- read via the SECURITY DEFINER lookup_caller_id RPC. No direct anon/authenticated access.
GRANT ALL ON public.dpdp_opt_outs TO service_role;
GRANT ALL ON public.contact_label_frequencies TO service_role;
GRANT ALL ON public.contact_label_votes TO service_role;

-- Lock down direct API access; privacy-hashed data is only reachable via the RPC / service role
ALTER TABLE public.dpdp_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_label_frequencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_label_votes ENABLE ROW LEVEL SECURITY;

-- 3. Trigger Function: Stay-Purged Guard (Block INSERTS/UPDATES if opted out)
CREATE OR REPLACE FUNCTION public.check_dpdp_opt_out()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.dpdp_opt_outs WHERE hashed_number = NEW.hashed_number) THEN
        RETURN NULL; -- Silently discard
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_dpdp_opt_out_freq ON public.contact_label_frequencies;
CREATE TRIGGER trg_check_dpdp_opt_out_freq
    BEFORE INSERT OR UPDATE ON public.contact_label_frequencies
    FOR EACH ROW EXECUTE FUNCTION public.check_dpdp_opt_out();

DROP TRIGGER IF EXISTS trg_check_dpdp_opt_out_votes ON public.contact_label_votes;
CREATE TRIGGER trg_check_dpdp_opt_out_votes
    BEFORE INSERT OR UPDATE ON public.contact_label_votes
    FOR EACH ROW EXECUTE FUNCTION public.check_dpdp_opt_out();

-- 4. Trigger Function: Purge Names on Opt-Out
CREATE OR REPLACE FUNCTION public.purge_on_dpdp_opt_out()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.contact_label_frequencies WHERE hashed_number = NEW.hashed_number;
    DELETE FROM public.contact_label_votes WHERE hashed_number = NEW.hashed_number;
    -- Intentionally NOT deleting from caller_reports to prevent reputation laundering
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_on_dpdp_opt_out ON public.dpdp_opt_outs;
CREATE TRIGGER trg_purge_on_dpdp_opt_out
    AFTER INSERT ON public.dpdp_opt_outs
    FOR EACH ROW EXECUTE FUNCTION public.purge_on_dpdp_opt_out();

-- 5. Trigger Function: Increment Frequency Count on Unique Vote
CREATE OR REPLACE FUNCTION public.increment_contact_label_frequency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.contact_label_frequencies (hashed_number, normalized_label, frequency_count)
    VALUES (NEW.hashed_number, NEW.normalized_label, 1)
    ON CONFLICT (hashed_number, normalized_label)
    DO UPDATE SET
        frequency_count = public.contact_label_frequencies.frequency_count + 1,
        updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_frequency_on_vote ON public.contact_label_votes;
CREATE TRIGGER trg_increment_frequency_on_vote
    AFTER INSERT ON public.contact_label_votes
    FOR EACH ROW EXECUTE FUNCTION public.increment_contact_label_frequency();

-- 6. Update RPC for Caller ID Lookup
CREATE OR REPLACE FUNCTION public.lookup_caller_id(p_hashed_number TEXT, p_raw_number TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  best_label TEXT;
  aggregate_record RECORD;
  direct_spam_count INTEGER;
  final_name TEXT;
  final_trust INTEGER;
  final_spam_reports INTEGER;
  is_opted_out BOOLEAN;
BEGIN
  -- Check DPDP Opt-Out
  SELECT EXISTS(SELECT 1 FROM public.dpdp_opt_outs WHERE hashed_number = p_hashed_number) INTO is_opted_out;

  -- Get best community label
  SELECT normalized_label INTO best_label
  FROM public.contact_label_frequencies
  WHERE hashed_number = p_hashed_number
  ORDER BY frequency_count DESC
  LIMIT 1;

  -- Get legacy aggregates if any
  SELECT community_name, total_reports, spam_reports, spam_percentage, most_common_type, community_label
  INTO aggregate_record
  FROM public.caller_id_aggregates
  WHERE phone_number = p_raw_number
  LIMIT 1;

  -- Direct spam reports from the real caller_reports table
  SELECT COUNT(*)
  INTO direct_spam_count
  FROM public.caller_reports
  WHERE phone_number = p_raw_number
    AND report_type IN ('spam','scam','telemarketer','robocall','fraud');

  IF is_opted_out THEN
      final_name := 'Unknown Caller';
  ELSE
      final_name := COALESCE(best_label, aggregate_record.community_name, 'Unknown Caller');
  END IF;

  final_spam_reports := GREATEST(COALESCE(aggregate_record.spam_reports, 0), COALESCE(direct_spam_count, 0));

  -- Calculate trust score (simple version: 100 - (spam * 20), min 5)
  final_trust := GREATEST(5, 100 - (final_spam_reports * 20));

  RETURN json_build_object(
    'name', final_name,
    'trust_score', final_trust,
    'spam_reports', final_spam_reports,
    'opted_out', is_opted_out
  );
END;
$$;