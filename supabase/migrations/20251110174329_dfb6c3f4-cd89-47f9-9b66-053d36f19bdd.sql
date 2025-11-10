-- Create user_locations table for location history tracking
CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  altitude DECIMAL(10, 2),
  speed DECIMAL(10, 2),
  heading DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own location history"
  ON public.user_locations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own location"
  ON public.user_locations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_locations_user_id ON public.user_locations(user_id);
CREATE INDEX idx_user_locations_created_at ON public.user_locations(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;