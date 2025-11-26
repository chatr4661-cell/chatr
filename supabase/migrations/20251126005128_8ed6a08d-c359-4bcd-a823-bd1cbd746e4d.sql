-- Create geo_cache table for storing fetched results
CREATE TABLE IF NOT EXISTS public.geo_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_km NUMERIC DEFAULT 5,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  sources_used TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  fetch_duration_ms INTEGER,
  result_count INTEGER DEFAULT 0
);

-- Create index for faster lookups
CREATE INDEX idx_geo_cache_query ON public.geo_cache(query, category);
CREATE INDEX idx_geo_cache_location ON public.geo_cache(latitude, longitude);
CREATE INDEX idx_geo_cache_expires ON public.geo_cache(expires_at);

-- Enable RLS
ALTER TABLE public.geo_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached results
CREATE POLICY "Anyone can view geo cache"
  ON public.geo_cache
  FOR SELECT
  USING (true);

-- System can insert cache
CREATE POLICY "System can insert geo cache"
  ON public.geo_cache
  FOR INSERT
  WITH CHECK (true);

-- Create user_locations table for storing user's recent locations
CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy_meters NUMERIC,
  detection_method TEXT CHECK (detection_method IN ('gps', 'device', 'ip', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user locations
CREATE INDEX idx_user_locations_user ON public.user_locations(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own locations
CREATE POLICY "Users can manage their locations"
  ON public.user_locations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_geo_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.geo_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;