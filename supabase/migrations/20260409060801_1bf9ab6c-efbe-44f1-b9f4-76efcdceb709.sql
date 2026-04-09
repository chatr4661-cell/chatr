
-- =============================================
-- CHATR++ IDENTITY SYSTEM - PHASE 1
-- Multi-Layer Identity + Trust Engine + Discovery
-- =============================================

-- 1. User Identities (multi-identity per user)
CREATE TABLE public.user_identities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  handle TEXT NOT NULL,
  suffix TEXT NOT NULL DEFAULT 'public',
  full_handle TEXT GENERATED ALWAYS AS (
    CASE WHEN suffix = 'public' THEN '@' || handle
    ELSE '@' || handle || '.' || suffix END
  ) STORED,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  identity_type TEXT NOT NULL DEFAULT 'personal'
    CHECK (identity_type IN ('personal', 'business', 'private', 'ai_clone')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'contacts', 'private', 'custom')),
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_clone_config JSONB DEFAULT '{}'::jsonb,
  ai_clone_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_clone_personality TEXT,
  ai_clone_boundaries JSONB DEFAULT '{"allow_job_inquiries": true, "allow_business": true, "allow_networking": true, "max_reply_length": 500}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (handle, suffix)
);

CREATE INDEX idx_user_identities_user ON public.user_identities(user_id);
CREATE INDEX idx_user_identities_handle ON public.user_identities(handle);
CREATE INDEX idx_user_identities_full_handle ON public.user_identities(full_handle);
CREATE INDEX idx_user_identities_type ON public.user_identities(identity_type);

ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own identities"
  ON public.user_identities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public identities are viewable by authenticated users"
  ON public.user_identities FOR SELECT
  TO authenticated
  USING (visibility = 'public' AND is_active = true);

-- 2. Identity Access Rules
CREATE TABLE public.identity_access_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identity_id UUID NOT NULL REFERENCES public.user_identities(id) ON DELETE CASCADE,
  granted_to_user_id UUID,
  granted_to_group TEXT,
  permission_level TEXT NOT NULL DEFAULT 'view'
    CHECK (permission_level IN ('view', 'message', 'call', 'full')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_identity_access_identity ON public.identity_access_rules(identity_id);
CREATE INDEX idx_identity_access_user ON public.identity_access_rules(granted_to_user_id);

ALTER TABLE public.identity_access_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Identity owners manage access rules"
  ON public.identity_access_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_identities ui
      WHERE ui.id = identity_id AND ui.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_identities ui
      WHERE ui.id = identity_id AND ui.user_id = auth.uid()
    )
  );

CREATE POLICY "Granted users can view their access"
  ON public.identity_access_rules FOR SELECT
  TO authenticated
  USING (granted_to_user_id = auth.uid());

-- 3. User Discovery Profiles (Global search layer)
CREATE TABLE public.user_discovery_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  headline TEXT,
  skills TEXT[] DEFAULT '{}',
  company TEXT,
  job_title TEXT,
  location TEXT,
  city TEXT,
  country TEXT,
  industry TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  is_searchable BOOLEAN NOT NULL DEFAULT true,
  search_visibility TEXT NOT NULL DEFAULT 'everyone'
    CHECK (search_visibility IN ('everyone', 'verified_only', 'contacts_only', 'nobody')),
  allow_messages_from TEXT NOT NULL DEFAULT 'everyone'
    CHECK (allow_messages_from IN ('everyone', 'verified_only', 'contacts_only', 'nobody')),
  allow_calls_from TEXT NOT NULL DEFAULT 'contacts_only'
    CHECK (allow_calls_from IN ('everyone', 'verified_only', 'contacts_only', 'nobody')),
  show_phone_to TEXT NOT NULL DEFAULT 'contacts_only'
    CHECK (show_phone_to IN ('everyone', 'contacts_only', 'verified_only', 'nobody')),
  anonymous_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discovery_skills ON public.user_discovery_profiles USING GIN(skills);
CREATE INDEX idx_discovery_location ON public.user_discovery_profiles(city, country);
CREATE INDEX idx_discovery_searchable ON public.user_discovery_profiles(is_searchable) WHERE is_searchable = true;

ALTER TABLE public.user_discovery_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own discovery profile"
  ON public.user_discovery_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Searchable profiles visible to authenticated users"
  ON public.user_discovery_profiles FOR SELECT
  TO authenticated
  USING (is_searchable = true AND anonymous_mode = false);

-- 4. Trust Factors (granular trust inputs)
CREATE TABLE public.trust_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  factor_type TEXT NOT NULL
    CHECK (factor_type IN (
      'kyc_verified', 'email_verified', 'phone_verified',
      'social_verified', 'usage_history', 'call_behavior',
      'spam_report', 'fraud_flag', 'community_standing',
      'response_rate', 'ai_analysis', 'manual_review'
    )),
  factor_value NUMERIC NOT NULL DEFAULT 0,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  source TEXT,
  evidence JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trust_factors_user ON public.trust_factors(user_id);
CREATE INDEX idx_trust_factors_type ON public.trust_factors(user_id, factor_type);

ALTER TABLE public.trust_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trust factors"
  ON public.trust_factors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage trust factors"
  ON public.trust_factors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Add primary_handle to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_handle TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS identity_tier TEXT DEFAULT 'free'
    CHECK (identity_tier IN ('free', 'plus', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS ai_clone_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS discovery_enabled BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(primary_handle) WHERE primary_handle IS NOT NULL;

-- 6. Compute trust score function
CREATE OR REPLACE FUNCTION public.compute_trust_score(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score NUMERIC := 50;
  v_total_weight NUMERIC := 0;
  v_weighted_sum NUMERIC := 0;
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

  -- Update user_trust_scores
  INSERT INTO public.user_trust_scores (user_id, trust_score, verification_level, last_updated)
  VALUES (
    p_user_id,
    v_score,
    CASE
      WHEN v_score >= 80 THEN 'premium'
      WHEN v_score >= 60 THEN 'identity'
      WHEN v_score >= 40 THEN 'email'
      WHEN v_score >= 20 THEN 'phone'
      ELSE 'unverified'
    END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    trust_score = EXCLUDED.trust_score,
    verification_level = EXCLUDED.verification_level,
    last_updated = now();

  RETURN v_score;
END;
$$;

-- 7. Auto-compute trust on factor changes
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

CREATE TRIGGER compute_trust_on_factor_change
  AFTER INSERT OR UPDATE ON public.trust_factors
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_compute_trust();

-- 8. Auto-create default identities on handle claim
CREATE OR REPLACE FUNCTION public.create_default_identities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.primary_handle IS NOT NULL AND (OLD.primary_handle IS NULL OR OLD.primary_handle != NEW.primary_handle) THEN
    -- Create public identity
    INSERT INTO public.user_identities (user_id, handle, suffix, display_name, identity_type, visibility)
    VALUES (NEW.id, NEW.primary_handle, 'public', COALESCE(NEW.username, NEW.primary_handle), 'personal', 'public')
    ON CONFLICT (handle, suffix) DO UPDATE SET display_name = EXCLUDED.display_name;

    -- Create work identity
    INSERT INTO public.user_identities (user_id, handle, suffix, display_name, identity_type, visibility)
    VALUES (NEW.id, NEW.primary_handle, 'work', COALESCE(NEW.username, NEW.primary_handle) || ' (Work)', 'business', 'contacts')
    ON CONFLICT (handle, suffix) DO NOTHING;

    -- Create private identity
    INSERT INTO public.user_identities (user_id, handle, suffix, display_name, identity_type, visibility)
    VALUES (NEW.id, NEW.primary_handle, 'private', COALESCE(NEW.username, NEW.primary_handle) || ' (Private)', 'private', 'private')
    ON CONFLICT (handle, suffix) DO NOTHING;

    -- Create AI clone identity
    INSERT INTO public.user_identities (user_id, handle, suffix, display_name, identity_type, visibility)
    VALUES (NEW.id, NEW.primary_handle, 'ai', COALESCE(NEW.username, NEW.primary_handle) || ' AI', 'ai_clone', 'public')
    ON CONFLICT (handle, suffix) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_identities_on_handle_claim
  AFTER UPDATE OF primary_handle ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_identities();

-- 9. Updated_at triggers
CREATE TRIGGER update_user_identities_updated_at
  BEFORE UPDATE ON public.user_identities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_discovery_profiles_updated_at
  BEFORE UPDATE ON public.user_discovery_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_trust_factors_updated_at
  BEFORE UPDATE ON public.trust_factors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
