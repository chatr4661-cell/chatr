-- Mini-Apps Ecosystem Database Schema

-- App Categories
CREATE TABLE IF NOT EXISTS public.app_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mini Apps
CREATE TABLE IF NOT EXISTS public.mini_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.app_categories(id),
  developer_id UUID REFERENCES auth.users(id),
  icon_url TEXT,
  cover_image_url TEXT,
  app_url TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  rating_average DECIMAL(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  install_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[],
  screenshots TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Installed Apps
CREATE TABLE IF NOT EXISTS public.user_installed_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  app_id UUID REFERENCES public.mini_apps(id) NOT NULL,
  installed_at TIMESTAMPTZ DEFAULT now(),
  last_opened_at TIMESTAMPTZ,
  UNIQUE(user_id, app_id)
);

-- App Reviews
CREATE TABLE IF NOT EXISTS public.app_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES public.mini_apps(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(app_id, user_id)
);

-- Official Accounts
CREATE TABLE IF NOT EXISTS public.official_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('service', 'subscription', 'community')),
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  follower_count INTEGER DEFAULT 0,
  category TEXT,
  contact_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Account Followers
CREATE TABLE IF NOT EXISTS public.account_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.official_accounts(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  followed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, user_id)
);

-- Developer Profiles
CREATE TABLE IF NOT EXISTS public.developer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  developer_name TEXT NOT NULL,
  company_name TEXT,
  website TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT false,
  total_apps INTEGER DEFAULT 0,
  total_downloads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default categories
INSERT INTO public.app_categories (name, description, icon, display_order) VALUES
('Social & Community', 'Dating, Pet adoption, Local groups, College hubs', '👥', 1),
('Learning & Careers', 'AI Resume builder, Jobs, Mentorship, Mock Interviews', '📚', 2),
('Health & Fitness', 'AI Health Assistant, Doctor booking, Diet tracking', '💪', 3),
('Local Services', 'Home repair, tutors, plumbers, delivery helpers', '🔧', 4),
('Food & Hostels', 'Hostel meal booking, food waste saver, delivery', '🍔', 5),
('Entertainment', 'Short videos, mini-games, trivia, AI content creation', '🎮', 6),
('Travel', 'Local cab booking, train/bus status', '✈️', 7),
('NGOs & Volunteering', 'Donation, pet adoption, blood donation', '❤️', 8),
('AI Tools', 'AI Image, Video, Voice generator; summarizer; document tools', '🤖', 9)
ON CONFLICT DO NOTHING;

-- RLS Policies

ALTER TABLE public.app_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_installed_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_profiles ENABLE ROW LEVEL SECURITY;

-- Categories - everyone can view
CREATE POLICY "Anyone can view categories" ON public.app_categories FOR SELECT USING (true);

-- Mini Apps - public viewing, developers can manage their own
CREATE POLICY "Anyone can view active apps" ON public.mini_apps FOR SELECT USING (is_active = true);
CREATE POLICY "Developers can insert apps" ON public.mini_apps FOR INSERT WITH CHECK (auth.uid() = developer_id);
CREATE POLICY "Developers can update their apps" ON public.mini_apps FOR UPDATE USING (auth.uid() = developer_id);
CREATE POLICY "Developers can delete their apps" ON public.mini_apps FOR DELETE USING (auth.uid() = developer_id);

-- User Installed Apps
CREATE POLICY "Users can view their installed apps" ON public.user_installed_apps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can install apps" ON public.user_installed_apps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can uninstall apps" ON public.user_installed_apps FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update app usage" ON public.user_installed_apps FOR UPDATE USING (auth.uid() = user_id);

-- App Reviews
CREATE POLICY "Anyone can view reviews" ON public.app_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.app_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their reviews" ON public.app_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their reviews" ON public.app_reviews FOR DELETE USING (auth.uid() = user_id);

-- Official Accounts
CREATE POLICY "Anyone can view verified accounts" ON public.official_accounts FOR SELECT USING (is_verified = true OR auth.uid() = user_id);
CREATE POLICY "Users can create accounts" ON public.official_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their accounts" ON public.official_accounts FOR UPDATE USING (auth.uid() = user_id);

-- Account Followers
CREATE POLICY "Users can view followers" ON public.account_followers FOR SELECT USING (true);
CREATE POLICY "Users can follow accounts" ON public.account_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow accounts" ON public.account_followers FOR DELETE USING (auth.uid() = user_id);

-- Developer Profiles
CREATE POLICY "Anyone can view verified developers" ON public.developer_profiles FOR SELECT USING (is_verified = true OR auth.uid() = user_id);
CREATE POLICY "Users can create developer profile" ON public.developer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their developer profile" ON public.developer_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Triggers for updating ratings
CREATE OR REPLACE FUNCTION update_app_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mini_apps 
  SET 
    rating_average = (SELECT AVG(rating) FROM app_reviews WHERE app_id = NEW.app_id),
    rating_count = (SELECT COUNT(*) FROM app_reviews WHERE app_id = NEW.app_id)
  WHERE id = NEW.app_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_app_rating_trigger
AFTER INSERT OR UPDATE ON app_reviews
FOR EACH ROW EXECUTE FUNCTION update_app_rating();

-- Trigger for follower count
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE official_accounts 
    SET follower_count = follower_count + 1
    WHERE id = NEW.account_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE official_accounts 
    SET follower_count = follower_count - 1
    WHERE id = OLD.account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_follower_count_trigger
AFTER INSERT OR DELETE ON account_followers
FOR EACH ROW EXECUTE FUNCTION update_follower_count();