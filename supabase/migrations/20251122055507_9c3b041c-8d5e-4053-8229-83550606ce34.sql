-- Add missing column to saved_searches if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'saved_searches' AND column_name = 'is_active') THEN
    ALTER TABLE public.saved_searches ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Create new tables only if they don't exist
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  search_type VARCHAR(50) NOT NULL,
  intent VARCHAR(50),
  result_count INTEGER DEFAULT 0,
  clicked_result_id TEXT,
  clicked_position INTEGER,
  has_location BOOLEAN DEFAULT false,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  response_time_ms INTEGER,
  source VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON public.search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics(query_text);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON public.search_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_intent ON public.search_analytics(intent);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON public.saved_searches(user_id, is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.search_filter_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_max_distance INTEGER DEFAULT 10000,
  default_min_rating DECIMAL(2,1) DEFAULT 0.0,
  default_price_range JSONB,
  preferred_categories TEXT[],
  exclude_categories TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.search_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_text TEXT NOT NULL UNIQUE,
  category VARCHAR(50),
  popularity_score INTEGER DEFAULT 1,
  is_trending BOOLEAN DEFAULT false,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_text ON public.search_suggestions(suggestion_text);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_trending ON public.search_suggestions(is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_search_suggestions_popularity ON public.search_suggestions(popularity_score DESC);

CREATE TABLE IF NOT EXISTS public.visual_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_hash TEXT NOT NULL UNIQUE,
  detected_objects JSONB,
  search_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_visual_search_hash ON public.visual_search_cache(image_hash);
CREATE INDEX IF NOT EXISTS idx_visual_search_expires ON public.visual_search_cache(expires_at);

CREATE TABLE IF NOT EXISTS public.search_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_type VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  avg_response_time_ms INTEGER,
  success_rate DECIMAL(5,2),
  total_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(search_type, source, date)
);

CREATE INDEX IF NOT EXISTS idx_search_metrics_date ON public.search_performance_metrics(date DESC);

CREATE TABLE IF NOT EXISTS public.search_result_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  result_id TEXT NOT NULL,
  result_type VARCHAR(50),
  ranking_score DECIMAL(10,4) DEFAULT 0.0,
  relevance_score DECIMAL(5,2),
  distance_score DECIMAL(5,2),
  rating_score DECIMAL(5,2),
  popularity_score DECIMAL(5,2),
  freshness_score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_result_rankings_query ON public.search_result_rankings(query_text);
CREATE INDEX IF NOT EXISTS idx_result_rankings_score ON public.search_result_rankings(ranking_score DESC);

CREATE TABLE IF NOT EXISTS public.location_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  search_count INTEGER DEFAULT 1,
  last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, location_name)
);

CREATE INDEX IF NOT EXISTS idx_location_history_user ON public.location_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_history_coords ON public.location_search_history(latitude, longitude);

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_filter_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_result_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_search_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_analytics' AND policyname = 'Users view own search analytics') THEN
    CREATE POLICY "Users view own search analytics" ON public.search_analytics FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_analytics' AND policyname = 'Users insert own search analytics') THEN
    CREATE POLICY "Users insert own search analytics" ON public.search_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_filter_preferences' AND policyname = 'Users manage filter prefs') THEN
    CREATE POLICY "Users manage filter prefs" ON public.search_filter_preferences FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_suggestions' AND policyname = 'Public read suggestions') THEN
    CREATE POLICY "Public read suggestions" ON public.search_suggestions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visual_search_cache' AND policyname = 'Public read visual cache') THEN
    CREATE POLICY "Public read visual cache" ON public.visual_search_cache FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_performance_metrics' AND policyname = 'Public read metrics') THEN
    CREATE POLICY "Public read metrics" ON public.search_performance_metrics FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_result_rankings' AND policyname = 'Public read rankings') THEN
    CREATE POLICY "Public read rankings" ON public.search_result_rankings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'location_search_history' AND policyname = 'Users manage location history') THEN
    CREATE POLICY "Users manage location history" ON public.location_search_history FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_search_suggestion_popularity()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_suggestion_popularity ON public.search_analytics;
CREATE TRIGGER trigger_update_suggestion_popularity
  AFTER INSERT ON public.search_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_search_suggestion_popularity();

CREATE OR REPLACE FUNCTION cleanup_expired_visual_search_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.visual_search_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;