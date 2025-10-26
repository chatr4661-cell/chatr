-- Dynamic In-Video Branding System

-- Brand partnerships table
CREATE TABLE IF NOT EXISTS brand_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  brand_logo_url TEXT,
  brand_website TEXT,
  contact_email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'pending')),
  budget_remaining INTEGER DEFAULT 0,
  cost_per_impression INTEGER DEFAULT 10,
  cost_per_interaction INTEGER DEFAULT 50,
  target_categories TEXT[] DEFAULT '{}',
  target_demographics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Brand placement types (what objects to replace)
CREATE TABLE IF NOT EXISTS brand_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brand_partnerships(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL, -- 'cup', 'phone', 't-shirt', 'background', etc.
  replacement_asset_url TEXT NOT NULL, -- AR asset or overlay image
  replacement_type TEXT DEFAULT 'overlay' CHECK (replacement_type IN ('overlay', 'ar_filter', 'background')),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Track impressions and interactions
CREATE TABLE IF NOT EXISTS brand_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brand_partnerships(id) ON DELETE CASCADE,
  placement_id UUID REFERENCES brand_placements(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  impression_type TEXT CHECK (impression_type IN ('view', 'interaction', 'click')),
  video_session_id UUID,
  detected_object TEXT,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AR filters marketplace
CREATE TABLE IF NOT EXISTS ar_brand_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brand_partnerships(id) ON DELETE CASCADE,
  filter_name TEXT NOT NULL,
  filter_description TEXT,
  filter_asset_url TEXT NOT NULL,
  preview_image_url TEXT,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat-based brand mentions
CREATE TABLE IF NOT EXISTS chat_brand_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brand_partnerships(id) ON DELETE CASCADE,
  trigger_keywords TEXT[] NOT NULL,
  response_type TEXT DEFAULT 'sticker' CHECK (response_type IN ('sticker', 'ar_suggest', 'banner')),
  response_asset_url TEXT,
  max_daily_triggers INTEGER DEFAULT 100,
  current_daily_count INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE brand_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_brand_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_brand_triggers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active brands"
  ON brand_partnerships FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage brands"
  ON brand_partnerships FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can view active placements"
  ON brand_placements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their own impressions"
  ON brand_impressions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert impressions"
  ON brand_impressions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view AR filters"
  ON ar_brand_filters FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view chat triggers"
  ON chat_brand_triggers FOR SELECT
  USING (true);

-- Function to track impression and deduct budget
CREATE OR REPLACE FUNCTION track_brand_impression(
  p_brand_id UUID,
  p_placement_id UUID,
  p_user_id UUID,
  p_impression_type TEXT,
  p_detected_object TEXT DEFAULT NULL,
  p_duration INTEGER DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost INTEGER;
  v_impression_id UUID;
  v_budget INTEGER;
BEGIN
  -- Get cost based on impression type
  SELECT 
    CASE 
      WHEN p_impression_type = 'interaction' THEN cost_per_interaction
      ELSE cost_per_impression
    END,
    budget_remaining
  INTO v_cost, v_budget
  FROM brand_partnerships
  WHERE id = p_brand_id;
  
  -- Check if brand has budget
  IF v_budget < v_cost THEN
    RAISE EXCEPTION 'Insufficient brand budget';
  END IF;
  
  -- Record impression
  INSERT INTO brand_impressions (
    brand_id, placement_id, user_id, impression_type, 
    detected_object, duration_seconds
  )
  VALUES (
    p_brand_id, p_placement_id, p_user_id, p_impression_type,
    p_detected_object, p_duration
  )
  RETURNING id INTO v_impression_id;
  
  -- Deduct from budget
  UPDATE brand_partnerships
  SET budget_remaining = budget_remaining - v_cost
  WHERE id = p_brand_id;
  
  RETURN v_impression_id;
END;
$$;

-- Function to get brand for detected object
CREATE OR REPLACE FUNCTION get_brand_for_object(
  p_object_type TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
  brand_id UUID,
  brand_name TEXT,
  placement_id UUID,
  replacement_asset_url TEXT,
  replacement_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.brand_id,
    b.brand_name,
    bp.id as placement_id,
    bp.replacement_asset_url,
    bp.replacement_type
  FROM brand_placements bp
  JOIN brand_partnerships b ON b.id = bp.brand_id
  WHERE bp.object_type = p_object_type
    AND bp.is_active = true
    AND b.status = 'active'
    AND b.budget_remaining > b.cost_per_impression
  ORDER BY bp.priority DESC, RANDOM()
  LIMIT 1;
END;
$$;

-- Update trigger for updated_at
CREATE TRIGGER update_brand_partnerships_updated_at
  BEFORE UPDATE ON brand_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();