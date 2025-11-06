-- ====================================
-- LOCATION-BASED DATABASES SCHEMA
-- Auto-populating user-generated databases
-- ====================================

-- Healthcare Database (Clinics, Doctors, Hospitals)
CREATE TABLE IF NOT EXISTS public.healthcare_db (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'clinic', 'hospital', 'pharmacy', 'lab'
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone_number TEXT,
  email TEXT,
  website TEXT,
  specialties TEXT[], -- ['cardiology', 'pediatrics', etc.]
  services_offered TEXT[],
  rating_average DECIMAL(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  added_by UUID REFERENCES profiles(id) NOT NULL,
  monetization_tier TEXT DEFAULT 'free', -- 'free', 'premium', 'partner'
  is_monetized BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Local Jobs Database
CREATE TABLE IF NOT EXISTS public.local_jobs_db (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  job_type TEXT NOT NULL, -- 'full-time', 'part-time', 'contract', 'internship'
  category TEXT NOT NULL, -- 'IT', 'Healthcare', 'Sales', etc.
  description TEXT NOT NULL,
  requirements TEXT[],
  salary_range TEXT,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_remote BOOLEAN DEFAULT false,
  contact_email TEXT,
  contact_phone TEXT,
  application_url TEXT,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  posted_by UUID REFERENCES profiles(id) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  monetization_tier TEXT DEFAULT 'free',
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Local Business Database
CREATE TABLE IF NOT EXISTS public.local_business_db (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL, -- 'restaurant', 'retail', 'service', 'manufacturing'
  category TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone_number TEXT,
  email TEXT,
  website TEXT,
  business_hours JSONB, -- {monday: "9AM-6PM", ...}
  services_products TEXT[],
  rating_average DECIMAL(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  added_by UUID REFERENCES profiles(id) NOT NULL,
  monetization_tier TEXT DEFAULT 'free',
  is_partner BOOLEAN DEFAULT false,
  has_active_offers BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Local Offers Database
CREATE TABLE IF NOT EXISTS public.local_offers_db (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_title TEXT NOT NULL,
  offer_description TEXT NOT NULL,
  offer_type TEXT NOT NULL, -- 'discount', 'deal', 'coupon', 'freebie'
  business_id UUID REFERENCES local_business_db(id),
  business_name TEXT NOT NULL,
  discount_percentage INTEGER,
  original_price DECIMAL(10, 2),
  offer_price DECIMAL(10, 2),
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  terms_conditions TEXT,
  redemption_code TEXT,
  redemption_count INTEGER DEFAULT 0,
  max_redemptions INTEGER,
  verified BOOLEAN DEFAULT false,
  posted_by UUID REFERENCES profiles(id) NOT NULL,
  monetization_tier TEXT DEFAULT 'free',
  is_sponsored BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Community Events Database (Location-based)
CREATE TABLE IF NOT EXISTS public.community_events_db (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_title TEXT NOT NULL,
  event_description TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'meetup', 'workshop', 'sports', 'cultural', 'social'
  organizer_name TEXT NOT NULL,
  organizer_id UUID REFERENCES profiles(id) NOT NULL,
  venue_name TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  entry_fee DECIMAL(10, 2),
  verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Location Searches (for analytics and monetization insights)
CREATE TABLE IF NOT EXISTS public.location_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL, -- 'healthcare', 'jobs', 'business', 'offers', 'events'
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city TEXT,
  state TEXT,
  pincode TEXT,
  results_count INTEGER DEFAULT 0,
  clicked_result_id UUID,
  clicked_result_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Monetization Tracking
CREATE TABLE IF NOT EXISTS public.monetization_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type TEXT NOT NULL, -- 'healthcare', 'job', 'business', 'offer'
  listing_id UUID NOT NULL,
  listing_type TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL, -- 'view', 'click', 'call', 'apply', 'redeem'
  location_city TEXT,
  location_pincode TEXT,
  revenue_potential DECIMAL(10, 2) DEFAULT 0,
  is_converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_healthcare_location ON healthcare_db(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_healthcare_pincode ON healthcare_db(pincode);
CREATE INDEX IF NOT EXISTS idx_healthcare_city ON healthcare_db(city);

CREATE INDEX IF NOT EXISTS idx_jobs_location ON local_jobs_db(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_jobs_pincode ON local_jobs_db(pincode);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON local_jobs_db(city);

CREATE INDEX IF NOT EXISTS idx_business_location ON local_business_db(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_business_pincode ON local_business_db(pincode);
CREATE INDEX IF NOT EXISTS idx_business_city ON local_business_db(city);

CREATE INDEX IF NOT EXISTS idx_offers_location ON local_offers_db(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_offers_pincode ON local_offers_db(pincode);
CREATE INDEX IF NOT EXISTS idx_offers_city ON local_offers_db(city);

CREATE INDEX IF NOT EXISTS idx_events_location ON community_events_db(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_date ON community_events_db(event_date);

-- Enable RLS
ALTER TABLE healthcare_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_jobs_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_business_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_offers_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Read - everyone can view, Write - authenticated users)
CREATE POLICY "Anyone can view healthcare listings"
  ON healthcare_db FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add healthcare listings"
  ON healthcare_db FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own healthcare listings"
  ON healthcare_db FOR UPDATE
  USING (auth.uid() = added_by);

CREATE POLICY "Anyone can view jobs"
  ON local_jobs_db FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can post jobs"
  ON local_jobs_db FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own jobs"
  ON local_jobs_db FOR UPDATE
  USING (auth.uid() = posted_by);

CREATE POLICY "Anyone can view businesses"
  ON local_business_db FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add businesses"
  ON local_business_db FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own businesses"
  ON local_business_db FOR UPDATE
  USING (auth.uid() = added_by);

CREATE POLICY "Anyone can view offers"
  ON local_offers_db FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add offers"
  ON local_offers_db FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own offers"
  ON local_offers_db FOR UPDATE
  USING (auth.uid() = posted_by);

CREATE POLICY "Anyone can view events"
  ON community_events_db FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON community_events_db FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own searches"
  ON location_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can log their searches"
  ON location_searches FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view monetization leads"
  ON monetization_leads FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

CREATE POLICY "System can create monetization leads"
  ON monetization_leads FOR INSERT
  WITH CHECK (true);