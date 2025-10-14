-- Add tags and trending support to mini_apps
ALTER TABLE mini_apps 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_trending boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS launch_date timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS monthly_active_users integer DEFAULT 0;

-- Create app_usage table for tracking frequent usage
CREATE TABLE IF NOT EXISTS app_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  app_id uuid REFERENCES mini_apps(id) ON DELETE CASCADE NOT NULL,
  last_used_at timestamptz DEFAULT now(),
  usage_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, app_id)
);

ALTER TABLE app_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_usage
CREATE POLICY "Users can view their own usage"
ON app_usage FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
ON app_usage FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
ON app_usage FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Function to track app usage
CREATE OR REPLACE FUNCTION track_app_usage(p_app_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO app_usage (user_id, app_id, usage_count, last_used_at)
  VALUES (auth.uid(), p_app_id, 1, now())
  ON CONFLICT (user_id, app_id) 
  DO UPDATE SET 
    usage_count = app_usage.usage_count + 1,
    last_used_at = now();
END;
$$;

-- Update sample apps with tags and trending status
UPDATE mini_apps SET tags = ARRAY['education', 'learning', 'tutoring'], is_trending = true WHERE app_name = 'Chatr Tutors';
UPDATE mini_apps SET tags = ARRAY['health', 'medical', 'wellness'], is_trending = true WHERE app_name = 'Health Hub';
UPDATE mini_apps SET tags = ARRAY['home', 'services', 'repair'], is_trending = false WHERE app_name = 'Home Service Pro';