-- ============================================
-- BETA LAUNCH SECURITY FIXES
-- Fix all function search_path issues
-- ============================================

-- 1. Fix update_trending_searches
CREATE OR REPLACE FUNCTION public.update_trending_searches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trending_searches (query, category, search_count, last_searched_at)
  VALUES (NEW.query_text, NEW.category, 1, NEW.timestamp)
  ON CONFLICT (query) 
  DO UPDATE SET 
    search_count = trending_searches.search_count + 1,
    last_searched_at = NEW.timestamp,
    category = COALESCE(EXCLUDED.category, trending_searches.category);
  RETURN NEW;
END;
$$;

-- 2. Fix calculate_session_duration
CREATE OR REPLACE FUNCTION public.calculate_session_duration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_end IS NOT NULL AND NEW.session_start IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Fix update_cache_hit_count
CREATE OR REPLACE FUNCTION public.update_cache_hit_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NULL;
END;
$$;

-- 4. Fix update_saved_searches_updated_at
CREATE OR REPLACE FUNCTION public.update_saved_searches_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5. Fix update_search_suggestion_popularity
CREATE OR REPLACE FUNCTION public.update_search_suggestion_popularity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.search_suggestions (suggestion_text, category, popularity_score, last_used_at)
  VALUES (NEW.query_text, NEW.intent, 1, NEW.timestamp)
  ON CONFLICT (suggestion_text) 
  DO UPDATE SET 
    popularity_score = public.search_suggestions.popularity_score + 1,
    last_used_at = NEW.timestamp,
    category = COALESCE(EXCLUDED.category, public.search_suggestions.category);
  RETURN NEW;
END;
$$;

-- 6. Fix cleanup_expired_visual_search_cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_visual_search_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.visual_search_cache WHERE expires_at < now();
END;
$$;

-- 7. Fix increment_cache_hit
CREATE OR REPLACE FUNCTION public.increment_cache_hit(cache_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.search_cache
  SET 
    hit_count = hit_count + 1,
    last_updated = now()
  WHERE id = cache_id;
END;
$$;

-- 8. Fix update_provider_rating
CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE service_providers SET rating_average = (SELECT AVG(rating) FROM service_reviews WHERE provider_id = NEW.provider_id), rating_count = (SELECT COUNT(*) FROM service_reviews WHERE provider_id = NEW.provider_id) WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$;

-- 9. Fix generate_booking_number
CREATE OR REPLACE FUNCTION public.generate_booking_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_number IS NULL THEN
    NEW.booking_number := 'BK' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

-- 10. Fix update_health_updated_at
CREATE OR REPLACE FUNCTION public.update_health_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. Fix clean_expired_geo_cache
CREATE OR REPLACE FUNCTION public.clean_expired_geo_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.geo_cache WHERE expires_at < NOW();
END;
$$;

-- 12. Fix calculate_booking_earnings
CREATE OR REPLACE FUNCTION public.calculate_booking_earnings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.commission_amount := NEW.total_amount * (SELECT commission_percentage FROM service_providers WHERE id = NEW.provider_id) / 100;
    NEW.provider_earnings := NEW.total_amount - NEW.commission_amount;
    UPDATE service_providers SET total_bookings = total_bookings + 1, total_earnings = total_earnings + NEW.provider_earnings WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 13. Fix increment_job_views
CREATE OR REPLACE FUNCTION public.increment_job_views(job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chatr_jobs SET views_count = views_count + 1 WHERE id = job_id;
END;
$$;

-- 14. Fix notify_user_contact_joined
CREATE OR REPLACE FUNCTION public.notify_user_contact_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact_record RECORD;
BEGIN
  FOR contact_record IN 
    SELECT DISTINCT c.user_id, c.contact_name
    FROM contacts c
    WHERE c.contact_phone_hash = NEW.phone_hash
    OR c.contact_phone = NEW.phone_number
  LOOP
    UPDATE contacts
    SET is_registered = true,
        contact_user_id = NEW.id
    WHERE user_id = contact_record.user_id
    AND (contact_phone_hash = NEW.phone_hash OR contact_phone = NEW.phone_number);
    
    INSERT INTO notifications (
      user_id, title, message, type, data, read
    ) VALUES (
      contact_record.user_id,
      'Contact Joined Chatr',
      contact_record.contact_name || ' is now on Chatr',
      'contact_joined',
      jsonb_build_object(
        'contact_id', NEW.id,
        'contact_username', NEW.username,
        'contact_avatar', NEW.avatar_url
      ),
      false
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- 15. Fix generate_user_referral_code
CREATE OR REPLACE FUNCTION public.generate_user_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();
  SELECT code INTO new_code FROM referral_codes WHERE user_id = user_id_val;
  IF new_code IS NOT NULL THEN RETURN new_code; END IF;
  new_code := upper(substring(md5(random()::text) from 1 for 8));
  INSERT INTO referral_codes (user_id, code) VALUES (user_id_val, new_code) RETURNING code INTO new_code;
  RETURN new_code;
END;
$$;

-- 16. Fix process_referral_reward
CREATE OR REPLACE FUNCTION public.process_referral_reward(referral_code_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id uuid;
  referred_user_id uuid;
BEGIN
  referred_user_id := auth.uid();
  SELECT user_id INTO referrer_user_id FROM referral_codes WHERE code = referral_code_param;
  IF referrer_user_id IS NULL THEN RETURN false; END IF;
  IF referrer_user_id = referred_user_id THEN RETURN false; END IF;
  INSERT INTO referrals (referrer_id, referred_id) VALUES (referrer_user_id, referred_user_id) ON CONFLICT DO NOTHING;
  UPDATE user_points SET balance = balance + 50, lifetime_earned = lifetime_earned + 50 WHERE user_id = referrer_user_id;
  INSERT INTO point_transactions (user_id, amount, transaction_type, source, description) VALUES (referrer_user_id, 50, 'earn', 'referral', 'Referral bonus: New user joined!');
  UPDATE user_points SET balance = balance + 25, lifetime_earned = lifetime_earned + 25 WHERE user_id = referred_user_id;
  INSERT INTO point_transactions (user_id, amount, transaction_type, source, description) VALUES (referred_user_id, 25, 'earn', 'referral_bonus', 'Bonus for using a referral code!');
  UPDATE referral_codes SET uses = uses + 1 WHERE code = referral_code_param;
  RETURN true;
END;
$$;

-- 17. Fix check_api_limit
CREATE OR REPLACE FUNCTION public.check_api_limit(api text, daily_max integer DEFAULT 10000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_usage INTEGER;
  result JSONB;
BEGIN
  INSERT INTO public.chatr_api_usage (api_name, date, request_count, daily_limit)
  VALUES (api, CURRENT_DATE, 1, daily_max)
  ON CONFLICT (api_name, date) 
  DO UPDATE SET request_count = public.chatr_api_usage.request_count + 1
  RETURNING request_count INTO current_usage;
  
  result := jsonb_build_object(
    'current', current_usage,
    'limit', daily_max,
    'remaining', daily_max - current_usage,
    'allowed', current_usage <= (daily_max * 0.9)
  );
  RETURN result;
END;
$$;

-- 18. Fix cleanup_old_webrtc_signals
CREATE OR REPLACE FUNCTION public.cleanup_old_webrtc_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM webrtc_signals WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- 19. Fix update_fame_score
CREATE OR REPLACE FUNCTION public.update_fame_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.fame_leaderboard (user_id, total_fame_score, total_posts, total_viral_posts, total_coins_earned)
  VALUES (NEW.user_id, NEW.ai_virality_score, 1, CASE WHEN NEW.is_viral THEN 1 ELSE 0 END, NEW.coins_earned)
  ON CONFLICT (user_id) DO UPDATE SET
    total_fame_score = public.fame_leaderboard.total_fame_score + NEW.ai_virality_score,
    total_posts = public.fame_leaderboard.total_posts + 1,
    total_viral_posts = public.fame_leaderboard.total_viral_posts + (CASE WHEN NEW.is_viral THEN 1 ELSE 0 END),
    total_coins_earned = public.fame_leaderboard.total_coins_earned + NEW.coins_earned,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- 20. Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 21. Fix update_last_seen
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$;

-- 22. Fix mark_call_as_missed
CREATE OR REPLACE FUNCTION public.mark_call_as_missed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ended' AND OLD.status = 'ringing' AND NEW.started_at IS NULL THEN
    NEW.missed = true;
  END IF;
  RETURN NEW;
END;
$$;

-- 23. Fix update_health_passport_updated_at
CREATE OR REPLACE FUNCTION public.update_health_passport_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 24. Fix update_phone_hash
CREATE OR REPLACE FUNCTION public.update_phone_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL AND (NEW.phone_hash IS NULL OR OLD.phone_number IS DISTINCT FROM NEW.phone_number) THEN
    NEW.phone_hash := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 25. Fix normalize_phone_search
CREATE OR REPLACE FUNCTION public.normalize_phone_search()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL THEN
    NEW.phone_search = regexp_replace(NEW.phone_number, '[\s\-]', '', 'g');
  END IF;
  RETURN NEW;
END;
$$;

-- 26. Fix auto_approve_verified_developer
CREATE OR REPLACE FUNCTION public.auto_approve_verified_developer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT is_verified FROM developer_profiles WHERE id = NEW.developer_id) = true
     AND (SELECT COUNT(*) FROM app_submissions WHERE developer_id = NEW.developer_id AND submission_status = 'approved') < 2 THEN
    NEW.submission_status := 'approved';
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- 27. Fix process_wallet_transaction
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(p_user_id uuid, p_type character varying, p_amount numeric, p_description text, p_reference_type character varying DEFAULT NULL::character varying, p_reference_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance DECIMAL(15, 2);
  v_transaction_id UUID;
BEGIN
  SELECT id, balance INTO v_wallet_id, v_new_balance FROM public.chatr_wallet WHERE user_id = p_user_id;
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.chatr_wallet (user_id, balance) VALUES (p_user_id, 0.00) RETURNING id, balance INTO v_wallet_id, v_new_balance;
  END IF;
  IF p_type IN ('credit', 'cashback', 'referral', 'refund') THEN
    v_new_balance := v_new_balance + p_amount;
  ELSIF p_type = 'debit' THEN
    IF v_new_balance < p_amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
    v_new_balance := v_new_balance - p_amount;
  END IF;
  INSERT INTO public.chatr_wallet_transactions (wallet_id, user_id, type, amount, balance_after, description, reference_type, reference_id)
  VALUES (v_wallet_id, p_user_id, p_type, p_amount, v_new_balance, p_description, p_reference_type, p_reference_id)
  RETURNING id INTO v_transaction_id;
  UPDATE public.chatr_wallet SET balance = v_new_balance,
    total_spent = CASE WHEN p_type = 'debit' THEN total_spent + p_amount ELSE total_spent END,
    total_earned = CASE WHEN p_type IN ('credit', 'cashback', 'referral') THEN total_earned + p_amount ELSE total_earned END,
    cashback_balance = CASE WHEN p_type = 'cashback' THEN cashback_balance + p_amount ELSE cashback_balance END,
    referral_earnings = CASE WHEN p_type = 'referral' THEN referral_earnings + p_amount ELSE referral_earnings END,
    updated_at = now()
  WHERE id = v_wallet_id;
  RETURN jsonb_build_object('success', true, 'transaction_id', v_transaction_id, 'new_balance', v_new_balance);
END;
$$;

-- Drop the security definer view if it exists and recreate as regular view
DROP VIEW IF EXISTS public.missed_calls_view CASCADE;

CREATE VIEW public.missed_calls_view AS
SELECT 
  c.id,
  c.caller_id,
  c.receiver_id,
  c.call_type,
  c.created_at,
  p.username as caller_username,
  p.avatar_url as caller_avatar
FROM calls c
JOIN profiles p ON p.id = c.caller_id
WHERE c.missed = true;