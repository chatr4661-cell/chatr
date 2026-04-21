-- Add missing columns to user_badges (used by VerifiedBadgePurchase)
ALTER TABLE public.user_badges
  ADD COLUMN IF NOT EXISTS badge_name TEXT,
  ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Allow upsert by (user_id, badge_type)
CREATE UNIQUE INDEX IF NOT EXISTS user_badges_user_type_uniq
  ON public.user_badges(user_id, badge_type);

-- Create missing user_trust_scores table
CREATE TABLE IF NOT EXISTS public.user_trust_scores (
  user_id UUID NOT NULL PRIMARY KEY,
  trust_score NUMERIC NOT NULL DEFAULT 50,
  verification_level TEXT NOT NULL DEFAULT 'unverified',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_trust_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trust scores are publicly readable" ON public.user_trust_scores;
CREATE POLICY "Trust scores are publicly readable"
  ON public.user_trust_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own trust score" ON public.user_trust_scores;
CREATE POLICY "Users can manage own trust score"
  ON public.user_trust_scores FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Idempotent factor award helper
CREATE OR REPLACE FUNCTION public.award_trust_factor(
  p_user_id UUID, p_factor_type TEXT, p_factor_value NUMERIC,
  p_weight NUMERIC, p_source TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.trust_factors
  WHERE user_id = p_user_id AND factor_type = p_factor_type
    AND COALESCE(source, '') = COALESCE(p_source, '');
  INSERT INTO public.trust_factors (user_id, factor_type, factor_value, weight, source)
  VALUES (p_user_id, p_factor_type, p_factor_value, p_weight, p_source);
END;
$$;

-- 1. Profile trust sync
CREATE OR REPLACE FUNCTION public.sync_profile_trust_factors()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL AND length(NEW.phone_number) >= 10 THEN
    PERFORM public.award_trust_factor(NEW.id, 'phone_verified', 80, 1.5, 'profile_phone');
  END IF;
  IF NEW.avatar_url IS NOT NULL AND length(NEW.avatar_url) > 5 THEN
    PERFORM public.award_trust_factor(NEW.id, 'social_verified', 60, 0.8, 'profile_avatar');
  END IF;
  IF NEW.username IS NOT NULL AND length(NEW.username) > 2
     AND NEW.username NOT LIKE 'User\_%' ESCAPE '\' THEN
    PERFORM public.award_trust_factor(NEW.id, 'social_verified', 50, 0.5, 'profile_username');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_trust ON public.profiles;
CREATE TRIGGER sync_profile_trust
  AFTER INSERT OR UPDATE OF phone_number, avatar_url, username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_trust_factors();

-- 2. Contacts trust sync
CREATE OR REPLACE FUNCTION public.sync_contacts_trust()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count INTEGER; v_uid UUID;
BEGIN
  v_uid := COALESCE(NEW.user_id, OLD.user_id);
  SELECT COUNT(*) INTO v_count FROM public.contacts WHERE user_id = v_uid;
  IF v_count >= 5 THEN
    PERFORM public.award_trust_factor(v_uid, 'usage_history', 70, 0.7, 'contacts_synced');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_contacts_trust_trigger ON public.contacts;
CREATE TRIGGER sync_contacts_trust_trigger
  AFTER INSERT OR DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.sync_contacts_trust();

-- 3. Calls trust sync
CREATE OR REPLACE FUNCTION public.sync_calls_trust()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count INTEGER;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    SELECT COUNT(*) INTO v_count FROM public.calls
    WHERE caller_id = NEW.caller_id AND status = 'completed';
    IF v_count >= 3 THEN
      PERFORM public.award_trust_factor(NEW.caller_id, 'call_behavior', 75, 1.0, 'calls_completed');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_calls_trust_trigger ON public.calls;
CREATE TRIGGER sync_calls_trust_trigger
  AFTER INSERT OR UPDATE OF status ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.sync_calls_trust();

-- 4. Messages trust sync
CREATE OR REPLACE FUNCTION public.sync_messages_trust()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.sender_id IS NOT NULL THEN
    PERFORM public.award_trust_factor(NEW.sender_id, 'response_rate', 60, 0.4, 'first_message');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_messages_trust_trigger ON public.messages;
CREATE TRIGGER sync_messages_trust_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.sync_messages_trust();

-- 5. Badge trust sync
CREATE OR REPLACE FUNCTION public.sync_badge_trust()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_value NUMERIC;
BEGIN
  IF COALESCE(NEW.is_active, true) = true THEN
    v_value := CASE NEW.badge_type
      WHEN 'elite' THEN 100 WHEN 'premium' THEN 90
      WHEN 'verified' THEN 85 ELSE 70 END;
    PERFORM public.award_trust_factor(NEW.user_id, 'kyc_verified', v_value, 2.0, 'badge_' || NEW.badge_type);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_badge_trust_trigger ON public.user_badges;
CREATE TRIGGER sync_badge_trust_trigger
  AFTER INSERT OR UPDATE ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.sync_badge_trust();

-- 6. Backfill existing users
DO $$
DECLARE
  r RECORD; v_contact_count INTEGER; v_call_count INTEGER;
  v_msg_count INTEGER; v_badge RECORD;
BEGIN
  FOR r IN SELECT id, phone_number, avatar_url, username FROM public.profiles LOOP
    IF r.phone_number IS NOT NULL AND length(r.phone_number) >= 10 THEN
      PERFORM public.award_trust_factor(r.id, 'phone_verified', 80, 1.5, 'profile_phone');
    END IF;
    IF r.avatar_url IS NOT NULL AND length(r.avatar_url) > 5 THEN
      PERFORM public.award_trust_factor(r.id, 'social_verified', 60, 0.8, 'profile_avatar');
    END IF;
    IF r.username IS NOT NULL AND length(r.username) > 2
       AND r.username NOT LIKE 'User\_%' ESCAPE '\' THEN
      PERFORM public.award_trust_factor(r.id, 'social_verified', 50, 0.5, 'profile_username');
    END IF;

    SELECT COUNT(*) INTO v_contact_count FROM public.contacts WHERE user_id = r.id;
    IF v_contact_count >= 5 THEN
      PERFORM public.award_trust_factor(r.id, 'usage_history', 70, 0.7, 'contacts_synced');
    END IF;

    SELECT COUNT(*) INTO v_call_count FROM public.calls WHERE caller_id = r.id AND status = 'completed';
    IF v_call_count >= 3 THEN
      PERFORM public.award_trust_factor(r.id, 'call_behavior', 75, 1.0, 'calls_completed');
    END IF;

    SELECT COUNT(*) INTO v_msg_count FROM public.messages WHERE sender_id = r.id;
    IF v_msg_count > 0 THEN
      PERFORM public.award_trust_factor(r.id, 'response_rate', 60, 0.4, 'first_message');
    END IF;

    SELECT badge_type INTO v_badge FROM public.user_badges
    WHERE user_id = r.id AND COALESCE(is_active, true) = true LIMIT 1;
    IF v_badge.badge_type IS NOT NULL THEN
      PERFORM public.award_trust_factor(
        r.id, 'kyc_verified',
        CASE v_badge.badge_type
          WHEN 'elite' THEN 100 WHEN 'premium' THEN 90
          WHEN 'verified' THEN 85 ELSE 70 END,
        2.0, 'badge_' || v_badge.badge_type);
    END IF;
  END LOOP;
END $$;