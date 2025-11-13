-- Universal AI Search Database Schema

-- Table: search_queries (store all search queries with AI intent)
CREATE TABLE IF NOT EXISTS public.search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  query_text TEXT NOT NULL,
  intent TEXT,
  category TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_text TEXT,
  source TEXT DEFAULT 'internal',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: search_results (store all search results from various sources)
CREATE TABLE IF NOT EXISTS public.search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID REFERENCES public.search_queries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  contact TEXT,
  address TEXT,
  distance NUMERIC,
  rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  price TEXT,
  image_url TEXT,
  link TEXT,
  verified BOOLEAN DEFAULT false,
  source TEXT NOT NULL,
  result_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: user_search_interactions (track user actions on results)
CREATE TABLE IF NOT EXISTS public.user_search_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  result_id UUID REFERENCES public.search_results(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: search_cache (cache frequently searched queries)
CREATE TABLE IF NOT EXISTS public.search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL UNIQUE,
  response_data JSONB NOT NULL,
  hit_count INTEGER DEFAULT 1,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: trending_searches (track trending queries)
CREATE TABLE IF NOT EXISTS public.trending_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL UNIQUE,
  search_count INTEGER DEFAULT 1,
  category TEXT,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_search_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search_queries
CREATE POLICY "Users can view their own search queries"
  ON public.search_queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own search queries"
  ON public.search_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for search_results (public read)
CREATE POLICY "Anyone can view search results"
  ON public.search_results FOR SELECT
  USING (true);

CREATE POLICY "System can insert search results"
  ON public.search_results FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_search_interactions
CREATE POLICY "Users can view their own interactions"
  ON public.user_search_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions"
  ON public.user_search_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for search_cache (public read)
CREATE POLICY "Anyone can view search cache"
  ON public.search_cache FOR SELECT
  USING (true);

CREATE POLICY "System can manage search cache"
  ON public.search_cache FOR ALL
  USING (true);

-- RLS Policies for trending_searches (public read)
CREATE POLICY "Anyone can view trending searches"
  ON public.trending_searches FOR SELECT
  USING (true);

CREATE POLICY "System can manage trending searches"
  ON public.trending_searches FOR ALL
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON public.search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_timestamp ON public.search_queries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_search_results_query_id ON public.search_results(query_id);
CREATE INDEX IF NOT EXISTS idx_search_results_source ON public.search_results(source);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_search_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_search_cache_query ON public.search_cache(query);
CREATE INDEX IF NOT EXISTS idx_trending_searches_count ON public.trending_searches(search_count DESC);

-- Function to update trending searches
CREATE OR REPLACE FUNCTION update_trending_searches()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.trending_searches (query, category, search_count, last_searched_at)
  VALUES (NEW.query_text, NEW.category, 1, NEW.timestamp)
  ON CONFLICT (query) 
  DO UPDATE SET 
    search_count = trending_searches.search_count + 1,
    last_searched_at = NEW.timestamp,
    category = COALESCE(EXCLUDED.category, trending_searches.category);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update trending searches
DROP TRIGGER IF EXISTS trigger_update_trending_searches ON public.search_queries;
CREATE TRIGGER trigger_update_trending_searches
  AFTER INSERT ON public.search_queries
  FOR EACH ROW
  EXECUTE FUNCTION update_trending_searches();

-- Function to update cache hit count
CREATE OR REPLACE FUNCTION update_cache_hit_count()
RETURNS void AS $$
BEGIN
  -- This will be called from the edge function when cache is hit
  NULL;
END;
$$ LANGUAGE plpgsql;