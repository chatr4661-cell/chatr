DROP FUNCTION IF EXISTS public.compute_trust_score(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.compute_trust_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score NUMERIC := 50;
  v_total_weight NUMERIC := 0;
  v_weighted_sum NUMERIC := 0;
  v_final INTEGER;
  r RECORD;
BEGIN
  FOR r IN
    SELECT factor_type, factor_value, weight
    FROM public.trust_factors
    WHERE user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > now())
  LOOP
    IF r.factor_type IN ('spam_report', 'fraud_flag') THEN
      v_weighted_sum := v_weighted_sum - (r.factor_value * r.weight);
    ELSE
      v_weighted_sum := v_weighted_sum + (r.factor_value * r.weight);
    END IF;
    v_total_weight := v_total_weight + r.weight;
  END LOOP;

  IF v_total_weight > 0 THEN
    v_score := GREATEST(0, LEAST(100, v_weighted_sum / v_total_weight));
  END IF;

  v_final := ROUND(v_score)::INTEGER;

  INSERT INTO public.user_trust_scores (user_id, trust_score, verification_level, last_updated)
  VALUES (
    p_user_id, v_final,
    CASE
      WHEN v_final >= 80 THEN 'premium'
      WHEN v_final >= 60 THEN 'identity'
      WHEN v_final >= 40 THEN 'email'
      WHEN v_final >= 20 THEN 'phone'
      ELSE 'unverified'
    END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    trust_score = EXCLUDED.trust_score,
    verification_level = EXCLUDED.verification_level,
    last_updated = now();

  RETURN v_final;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_compute_trust()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.compute_trust_score(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS compute_trust_on_factor_change ON public.trust_factors;
CREATE TRIGGER compute_trust_on_factor_change
AFTER INSERT OR UPDATE OR DELETE ON public.trust_factors
FOR EACH ROW EXECUTE FUNCTION public.trigger_compute_trust();

UPDATE public.user_trust_scores SET trust_score = ROUND(trust_score) WHERE trust_score <> ROUND(trust_score);