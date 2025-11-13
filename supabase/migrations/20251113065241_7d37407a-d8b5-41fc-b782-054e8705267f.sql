-- Saved Searches and Favorites System

-- Table: saved_searches (store user's saved search queries)
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  search_filters JSONB DEFAULT '{}'::jsonb,
  notification_enabled BOOLEAN DEFAULT true,
  notification_frequency TEXT DEFAULT 'daily', -- instant, daily, weekly
  last_notification_sent TIMESTAMPTZ,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: favorite_results (store user's favorited search results)
CREATE TABLE IF NOT EXISTS public.favorite_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  result_id UUID REFERENCES public.search_results(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[],
  reminder_date TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, result_id)
);

-- Table: search_alerts (notifications when new results match saved searches)
CREATE TABLE IF NOT EXISTS public.search_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_search_id UUID REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  new_results_count INTEGER DEFAULT 0,
  alert_type TEXT DEFAULT 'new_results', -- new_results, price_drop, availability
  alert_data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: visual_search_history (store visual search uploads and results)
CREATE TABLE IF NOT EXISTS public.visual_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_analysis JSONB DEFAULT '{}'::jsonb, -- AI detected objects, colors, etc.
  search_query_generated TEXT,
  results_found INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_searches
CREATE POLICY "Users can view their own saved searches"
  ON public.saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved searches"
  ON public.saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches"
  ON public.saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches"
  ON public.saved_searches FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for favorite_results
CREATE POLICY "Users can view their own favorites"
  ON public.favorite_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
  ON public.favorite_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites"
  ON public.favorite_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.favorite_results FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for search_alerts
CREATE POLICY "Users can view their own alerts"
  ON public.search_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create alerts"
  ON public.search_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own alerts"
  ON public.search_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for visual_search_history
CREATE POLICY "Users can view their own visual searches"
  ON public.visual_search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own visual searches"
  ON public.visual_search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_results_user_id ON public.favorite_results(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_results_result_id ON public.favorite_results(result_id);
CREATE INDEX IF NOT EXISTS idx_search_alerts_user_id ON public.search_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_search_alerts_saved_search ON public.search_alerts(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_visual_search_user_id ON public.visual_search_history(user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_update_saved_searches_updated_at ON public.saved_searches;
CREATE TRIGGER trigger_update_saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_searches_updated_at();

DROP TRIGGER IF EXISTS trigger_update_favorite_results_updated_at ON public.favorite_results;
CREATE TRIGGER trigger_update_favorite_results_updated_at
  BEFORE UPDATE ON public.favorite_results
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_searches_updated_at();