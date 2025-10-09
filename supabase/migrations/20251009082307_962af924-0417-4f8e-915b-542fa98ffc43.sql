-- Add onboarding and international support columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS contacts_synced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_contact_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS preferred_country_code TEXT DEFAULT '+91',
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS status_message TEXT DEFAULT 'Hey there! I''m using chatr.chat';

-- Create invite_links table for referral tracking
CREATE TABLE IF NOT EXISTS invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  uses_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on invite_links
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for invite_links
CREATE POLICY "Users can view their own invite links"
ON invite_links FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invite links"
ON invite_links FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create onboarding_progress table for analytics
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  step_name TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on onboarding_progress
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for onboarding_progress
CREATE POLICY "Users can manage their own onboarding progress"
ON onboarding_progress FOR ALL
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invite_links_code ON invite_links(invite_code);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);