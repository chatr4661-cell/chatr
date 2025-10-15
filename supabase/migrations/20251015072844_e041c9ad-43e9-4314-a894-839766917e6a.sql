-- Phase 1: Business Foundation Schema
-- Business subscriptions for different pricing tiers
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'starter', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trialing')),
  monthly_price NUMERIC DEFAULT 0,
  features JSONB DEFAULT '{}'::jsonb, -- Feature flags like max_customers, max_team_members, ai_enabled
  trial_ends_at TIMESTAMPTZ,
  billing_cycle_start DATE DEFAULT CURRENT_DATE,
  next_billing_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Business team members for multi-user workspaces
CREATE TABLE IF NOT EXISTS public.business_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '[]'::jsonb, -- Array of permission strings
  joined_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES profiles(id),
  UNIQUE(business_id, user_id)
);

-- Business conversations for unified inbox
CREATE TABLE IF NOT EXISTS public.business_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'archived')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, conversation_id)
);

-- Extend business_profiles with additional fields
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS business_email TEXT;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS business_phone TEXT;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS verification_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES business_subscriptions(id);

-- Enable RLS
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_subscriptions
CREATE POLICY "Business owners can view their subscription"
ON business_subscriptions FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT id FROM business_profiles WHERE user_id = auth.uid()
  )
  OR
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can manage subscription"
ON business_subscriptions FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT id FROM business_profiles WHERE user_id = auth.uid()
  )
);

-- RLS Policies for business_team_members
CREATE POLICY "Team members can view their team"
ON business_team_members FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT id FROM business_profiles WHERE user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Business owners and admins can manage team"
ON business_team_members FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT btm.business_id FROM business_team_members btm
    WHERE btm.user_id = auth.uid() 
    AND btm.role IN ('owner', 'admin')
  )
);

-- RLS Policies for business_conversations
CREATE POLICY "Team members can view business conversations"
ON business_conversations FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can manage conversations"
ON business_conversations FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business_id ON business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_team_members_business_id ON business_team_members(business_id);
CREATE INDEX IF NOT EXISTS idx_business_team_members_user_id ON business_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_conversations_business_id ON business_conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_conversations_status ON business_conversations(status);
CREATE INDEX IF NOT EXISTS idx_business_conversations_assigned_to ON business_conversations(assigned_to);

-- Triggers for updated_at
CREATE TRIGGER update_business_subscriptions_updated_at
BEFORE UPDATE ON business_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_conversations_updated_at
BEFORE UPDATE ON business_conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create free subscription when business profile is created
CREATE OR REPLACE FUNCTION create_default_business_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_subscription_id UUID;
BEGIN
  -- Create free plan subscription
  INSERT INTO business_subscriptions (
    business_id,
    plan_type,
    status,
    monthly_price,
    features
  ) VALUES (
    NEW.id,
    'free',
    'active',
    0,
    '{"max_customers": 100, "max_team_members": 1, "broadcasts_enabled": false, "ai_enabled": false}'::jsonb
  ) RETURNING id INTO new_subscription_id;
  
  -- Update business profile with subscription_id
  NEW.subscription_id := new_subscription_id;
  
  -- Create team member entry for the owner
  INSERT INTO business_team_members (
    business_id,
    user_id,
    role
  ) VALUES (
    NEW.id,
    NEW.user_id,
    'owner'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create subscription
CREATE TRIGGER on_business_profile_created
BEFORE INSERT ON business_profiles
FOR EACH ROW
EXECUTE FUNCTION create_default_business_subscription();