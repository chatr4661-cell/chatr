-- Create user_contacts table for contact sync
CREATE TABLE IF NOT EXISTS public.user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, contact_user_id)
);

-- Create location_shares table for live location sharing
CREATE TABLE IF NOT EXISTS public.location_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with UUID[] NOT NULL,
  duration TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create referrals table for tracking invites
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_contacts
CREATE POLICY "Users can view their own contacts"
  ON public.user_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts"
  ON public.user_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
  ON public.user_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for location_shares
CREATE POLICY "Users can view their own location shares"
  ON public.location_shares FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = ANY(shared_with));

CREATE POLICY "Users can create their own location shares"
  ON public.location_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location shares"
  ON public.location_shares FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update their own referrals"
  ON public.referrals FOR UPDATE
  USING (auth.uid() = referrer_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_contacts_user_id ON public.user_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_location_shares_user_id ON public.location_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_location_shares_active ON public.location_shares(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);