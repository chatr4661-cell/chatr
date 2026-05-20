
-- ============ WELLNESS COMMUNITIES ============
CREATE TABLE IF NOT EXISTS public.wellness_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  city TEXT,
  cover_image TEXT,
  members_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View active wellness communities" ON public.wellness_communities FOR SELECT USING (is_active = true);
CREATE POLICY "Create wellness communities" ON public.wellness_communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner update wellness communities" ON public.wellness_communities FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Owner delete wellness communities" ON public.wellness_communities FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS public.wellness_community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.wellness_communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);
ALTER TABLE public.wellness_community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View community members" ON public.wellness_community_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Join wellness community" ON public.wellness_community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leave wellness community" ON public.wellness_community_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_wellness_community_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wellness_communities SET members_count = members_count + 1 WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wellness_communities SET members_count = GREATEST(members_count - 1, 0) WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_wellness_community_count
AFTER INSERT OR DELETE ON public.wellness_community_members
FOR EACH ROW EXECUTE FUNCTION public.bump_wellness_community_count();

-- ============ WELLNESS STORIES ============
CREATE TABLE IF NOT EXISTS public.wellness_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  category TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View public stories" ON public.wellness_stories FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Create own stories" ON public.wellness_stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own stories" ON public.wellness_stories FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own stories" ON public.wellness_stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.story_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.wellness_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View story likes" ON public.story_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Like a story" ON public.story_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Unlike a story" ON public.story_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_story_likes_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wellness_stories SET likes_count = likes_count + 1 WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wellness_stories SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_story_likes_count
AFTER INSERT OR DELETE ON public.story_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_story_likes_count();

-- ============ WELLNESS PROGRAMS (events) ============
CREATE TABLE IF NOT EXISTS public.wellness_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'online',
  city TEXT,
  venue TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  cover_image TEXT,
  host_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View active programs" ON public.wellness_programs FOR SELECT USING (is_active = true);
CREATE POLICY "Host create programs" ON public.wellness_programs FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host update programs" ON public.wellness_programs FOR UPDATE TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "Host delete programs" ON public.wellness_programs FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- ============ WELLNESS CIRCLES ============
CREATE TABLE IF NOT EXISTS public.wellness_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  members_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_circles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View public circles" ON public.wellness_circles FOR SELECT USING (is_private = false OR auth.uid() = created_by);
CREATE POLICY "Create circles" ON public.wellness_circles FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner update circles" ON public.wellness_circles FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Owner delete circles" ON public.wellness_circles FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS public.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.wellness_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(circle_id, user_id)
);
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View circle members" ON public.circle_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Join circle" ON public.circle_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leave circle" ON public.circle_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_circle_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wellness_circles SET members_count = members_count + 1 WHERE id = NEW.circle_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wellness_circles SET members_count = GREATEST(members_count - 1, 0) WHERE id = OLD.circle_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_circle_count
AFTER INSERT OR DELETE ON public.circle_members
FOR EACH ROW EXECUTE FUNCTION public.bump_circle_count();

-- ============ EXPERT SESSIONS ============
CREATE TABLE IF NOT EXISTS public.expert_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  expert_id UUID,
  expert_name TEXT,
  expert_avatar TEXT,
  category TEXT,
  session_datetime TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  meeting_url TEXT,
  participants_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expert_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View sessions" ON public.expert_sessions FOR SELECT USING (true);
CREATE POLICY "Expert create session" ON public.expert_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = expert_id);
CREATE POLICY "Expert update session" ON public.expert_sessions FOR UPDATE TO authenticated USING (auth.uid() = expert_id);
CREATE POLICY "Expert delete session" ON public.expert_sessions FOR DELETE TO authenticated USING (auth.uid() = expert_id);

CREATE TABLE IF NOT EXISTS public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.expert_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View session participants" ON public.session_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Register session" ON public.session_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Unregister session" ON public.session_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ USER STATS (leaderboard) ============
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY,
  total_points INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View user stats" ON public.user_stats FOR SELECT USING (true);
CREATE POLICY "Update own stats" ON public.user_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own stats" ON public.user_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ Realtime ============
ALTER TABLE public.wellness_stories REPLICA IDENTITY FULL;
ALTER TABLE public.user_stats REPLICA IDENTITY FULL;
ALTER TABLE public.dhandha_transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wellness_stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dhandha_transactions;
