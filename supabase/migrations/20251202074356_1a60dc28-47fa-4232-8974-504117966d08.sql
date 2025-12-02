-- Create search_logs table
CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'web',
  engine TEXT DEFAULT 'google_custom_search',
  gps_lat DOUBLE PRECISION,
  gps_lon DOUBLE PRECISION,
  ip TEXT,
  ip_country TEXT,
  ip_city TEXT,
  ip_lat DOUBLE PRECISION,
  ip_lon DOUBLE PRECISION,
  last_known_lat DOUBLE PRECISION,
  last_known_lon DOUBLE PRECISION
);

-- Create click_logs table
CREATE TABLE IF NOT EXISTS public.click_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.search_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  result_rank INTEGER NOT NULL,
  result_url TEXT NOT NULL,
  result_type TEXT,
  time_to_click_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create last_locations table
CREATE TABLE IF NOT EXISTS public.last_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  accuracy_m DOUBLE PRECISION,
  source TEXT NOT NULL CHECK (source IN ('gps', 'ip')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(session_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_search_logs_session_id ON public.search_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON public.search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON public.search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_click_logs_search_id ON public.click_logs(search_id);
CREATE INDEX IF NOT EXISTS idx_click_logs_result_url ON public.click_logs(result_url);
CREATE INDEX IF NOT EXISTS idx_last_locations_user_id ON public.last_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_last_locations_session_id ON public.last_locations(session_id);

-- Enable RLS
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.last_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search_logs (allow users to view their own searches)
CREATE POLICY "Users can view their own search logs"
  ON public.search_logs FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can insert their own search logs"
  ON public.search_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for click_logs
CREATE POLICY "Users can view their own click logs"
  ON public.click_logs FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can insert their own click logs"
  ON public.click_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for last_locations
CREATE POLICY "Users can view their own location"
  ON public.last_locations FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can upsert their own location"
  ON public.last_locations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own location"
  ON public.last_locations FOR UPDATE
  USING (auth.uid() = user_id OR session_id IS NOT NULL);