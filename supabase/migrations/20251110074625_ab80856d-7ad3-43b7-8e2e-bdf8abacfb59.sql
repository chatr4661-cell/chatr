-- Create geofences table for location-based zones
CREATE TABLE IF NOT EXISTS public.geofences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hospital', 'job', 'event', 'community', 'custom')),
  description TEXT,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 500,
  trigger_on_enter BOOLEAN DEFAULT true,
  trigger_on_exit BOOLEAN DEFAULT false,
  notification_title TEXT,
  notification_body TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create geofence events table to track enter/exit events
CREATE TABLE IF NOT EXISTS public.geofence_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  geofence_id UUID NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('enter', 'exit')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;

-- Geofences policies (publicly viewable, admin can manage)
CREATE POLICY "Geofences are viewable by everyone"
  ON public.geofences FOR SELECT
  USING (active = true);

CREATE POLICY "Authenticated users can create geofences"
  ON public.geofences FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own geofences"
  ON public.geofences FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own geofences"
  ON public.geofences FOR DELETE
  USING (auth.uid() = created_by);

-- Geofence events policies
CREATE POLICY "Users can view their own events"
  ON public.geofence_events FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own events"
  ON public.geofence_events FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Create indexes for performance
CREATE INDEX idx_geofences_location ON public.geofences (center_lat, center_lng);
CREATE INDEX idx_geofences_type ON public.geofences (type) WHERE active = true;
CREATE INDEX idx_geofence_events_user ON public.geofence_events (user_id, timestamp DESC);
CREATE INDEX idx_geofence_events_geofence ON public.geofence_events (geofence_id, timestamp DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_geofence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_geofences_updated_at
  BEFORE UPDATE ON public.geofences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_geofence_updated_at();

-- Insert sample geofences for testing
INSERT INTO public.geofences (name, type, description, center_lat, center_lng, radius_meters, notification_title, notification_body) VALUES
  ('City Hospital', 'hospital', 'Main city hospital with emergency services', 28.6139, 77.2090, 300, 'Near City Hospital', 'You are near City Hospital - Emergency services available 24/7'),
  ('Tech Park Jobs', 'job', 'IT job opportunities in tech park', 28.5355, 77.3910, 500, 'Job Opportunities Nearby', 'Multiple tech companies hiring in this area'),
  ('Community Center', 'community', 'Local community center for events', 28.7041, 77.1025, 400, 'Community Event', 'Check out events happening at the community center');