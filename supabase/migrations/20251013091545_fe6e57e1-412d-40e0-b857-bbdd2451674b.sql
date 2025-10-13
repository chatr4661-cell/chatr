-- Developer Portal & SSO System

-- App submissions table for developers to submit apps for review
CREATE TABLE IF NOT EXISTS app_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID REFERENCES developer_profiles(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  app_url TEXT NOT NULL,
  category_id UUID REFERENCES app_categories(id),
  tags TEXT[] DEFAULT '{}',
  screenshots TEXT[] DEFAULT '{}',
  privacy_policy_url TEXT,
  terms_url TEXT,
  support_email TEXT,
  submission_status TEXT DEFAULT 'pending' CHECK (submission_status IN ('pending', 'approved', 'rejected', 'revision_needed')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SSO tokens for seamless authentication between Chatr and mini-apps
CREATE TABLE IF NOT EXISTS sso_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  app_id UUID REFERENCES mini_apps(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- App analytics for developers
CREATE TABLE IF NOT EXISTS app_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES mini_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL, -- 'install', 'open', 'uninstall'
  session_duration INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_submissions
CREATE POLICY "Developers can view their own submissions"
  ON app_submissions FOR SELECT
  USING (developer_id IN (SELECT id FROM developer_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Developers can create submissions"
  ON app_submissions FOR INSERT
  WITH CHECK (developer_id IN (SELECT id FROM developer_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Developers can update their pending submissions"
  ON app_submissions FOR UPDATE
  USING (developer_id IN (SELECT id FROM developer_profiles WHERE user_id = auth.uid()) AND submission_status = 'pending');

CREATE POLICY "Admins can view all submissions"
  ON app_submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update submissions"
  ON app_submissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for sso_tokens
CREATE POLICY "Users can view their own SSO tokens"
  ON sso_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create SSO tokens"
  ON sso_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for app_analytics
CREATE POLICY "Developers can view their app analytics"
  ON app_analytics FOR SELECT
  USING (app_id IN (
    SELECT ma.id FROM mini_apps ma
    JOIN developer_profiles dp ON ma.id = ANY(
      SELECT id FROM mini_apps WHERE id IN (
        SELECT app_id FROM app_submissions WHERE developer_id = dp.id AND submission_status = 'approved'
      )
    )
    WHERE dp.user_id = auth.uid()
  ));

CREATE POLICY "System can insert analytics"
  ON app_analytics FOR INSERT
  WITH CHECK (true);

-- Add developer portal access field to developer_profiles
ALTER TABLE developer_profiles 
ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

-- Trigger to auto-approve first submission from verified developers
CREATE OR REPLACE FUNCTION auto_approve_verified_developer()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-approve if developer is verified and has less than 2 approved apps
  IF (SELECT is_verified FROM developer_profiles WHERE id = NEW.developer_id) = true
     AND (SELECT COUNT(*) FROM app_submissions WHERE developer_id = NEW.developer_id AND submission_status = 'approved') < 2 THEN
    NEW.submission_status := 'approved';
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_app_submission
  BEFORE INSERT ON app_submissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_verified_developer();

-- Function to generate SSO token
CREATE OR REPLACE FUNCTION generate_sso_token(p_app_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Generate secure random token
  v_token := encode(gen_random_bytes(32), 'base64');
  
  -- Insert token with 5 minute expiry
  INSERT INTO sso_tokens (user_id, app_id, token, expires_at)
  VALUES (v_user_id, p_app_id, v_token, now() + INTERVAL '5 minutes');
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;