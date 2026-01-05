
-- Create communities table for the Communities module
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  icon_url TEXT,
  category TEXT,
  is_public BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create community_members table
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Create statuses table for Stories/Status feature
CREATE TABLE IF NOT EXISTS public.statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  media_url TEXT,
  media_type TEXT DEFAULT 'image',
  caption TEXT,
  background_color TEXT,
  font_style TEXT,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key to status_views if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'status_views' AND column_name = 'status_id'
  ) THEN
    ALTER TABLE public.status_views ADD COLUMN status_id UUID REFERENCES public.statuses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create user_rewards table for Rewards Shop
CREATE TABLE IF NOT EXISTS public.user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_type TEXT NOT NULL,
  reward_name TEXT NOT NULL,
  reward_value INTEGER DEFAULT 0,
  coins_spent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  redeemed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create push_subscriptions table for web push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on all tables
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Communities policies (drop if exists first)
DROP POLICY IF EXISTS "Public communities are viewable by everyone" ON public.communities;
CREATE POLICY "Public communities are viewable by everyone"
ON public.communities FOR SELECT
USING (is_public = true);

DROP POLICY IF EXISTS "Users can create communities" ON public.communities;
CREATE POLICY "Users can create communities"
ON public.communities FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creators can update their communities" ON public.communities;
CREATE POLICY "Creators can update their communities"
ON public.communities FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Community members policies
DROP POLICY IF EXISTS "Members can view community members" ON public.community_members;
CREATE POLICY "Members can view community members"
ON public.community_members FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
CREATE POLICY "Users can join communities"
ON public.community_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave communities" ON public.community_members;
CREATE POLICY "Users can leave communities"
ON public.community_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Statuses policies
DROP POLICY IF EXISTS "Users can view active statuses" ON public.statuses;
CREATE POLICY "Users can view active statuses"
ON public.statuses FOR SELECT
TO authenticated
USING (is_active = true AND expires_at > now());

DROP POLICY IF EXISTS "Users can create their own statuses" ON public.statuses;
CREATE POLICY "Users can create their own statuses"
ON public.statuses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own statuses" ON public.statuses;
CREATE POLICY "Users can update their own statuses"
ON public.statuses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own statuses" ON public.statuses;
CREATE POLICY "Users can delete their own statuses"
ON public.statuses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Status views policies
DROP POLICY IF EXISTS "Users can view status views" ON public.status_views;
CREATE POLICY "Users can view status views"
ON public.status_views FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can record their views" ON public.status_views;
CREATE POLICY "Users can record their views"
ON public.status_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = viewer_id);

-- User rewards policies
DROP POLICY IF EXISTS "Users can view their own rewards" ON public.user_rewards;
CREATE POLICY "Users can view their own rewards"
ON public.user_rewards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own rewards" ON public.user_rewards;
CREATE POLICY "Users can create their own rewards"
ON public.user_rewards FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own rewards" ON public.user_rewards;
CREATE POLICY "Users can update their own rewards"
ON public.user_rewards FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Push subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their own subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can create their own subscriptions"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update their own subscriptions"
ON public.push_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own subscriptions"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_communities_category ON public.communities(category);
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON public.communities(created_by);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_statuses_user ON public.statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_expires ON public.statuses(expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_status_views_status ON public.status_views(status_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON public.user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
