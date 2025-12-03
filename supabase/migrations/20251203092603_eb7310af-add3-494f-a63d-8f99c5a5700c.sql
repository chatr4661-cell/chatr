-- =============================================
-- CHATR WORLD DATABASE SCHEMA
-- =============================================

-- Jobs Table
CREATE TABLE IF NOT EXISTS public.chatr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  salary_min INTEGER,
  salary_max INTEGER,
  salary_type TEXT DEFAULT 'monthly', -- hourly, monthly, yearly
  job_type TEXT DEFAULT 'full-time', -- full-time, part-time, contract, freelance
  skills TEXT[],
  experience_years INTEGER DEFAULT 0,
  category TEXT,
  image_url TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Job Applications
CREATE TABLE IF NOT EXISTS public.chatr_job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.chatr_jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  resume_url TEXT,
  cover_letter TEXT,
  status TEXT DEFAULT 'pending', -- pending, reviewed, shortlisted, rejected, hired
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, user_id)
);

-- Healthcare Providers
CREATE TABLE IF NOT EXISTS public.chatr_healthcare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- doctor, clinic, hospital, lab, pharmacy
  specialty TEXT, -- general, dental, eye, cardiology, etc.
  description TEXT,
  address TEXT,
  city TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT,
  email TEXT,
  website TEXT,
  image_url TEXT,
  gallery_images TEXT[],
  rating_average DECIMAL(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  consultation_fee INTEGER,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  available_days TEXT[], -- monday, tuesday, etc.
  opening_time TIME,
  closing_time TIME,
  accepts_insurance BOOLEAN DEFAULT false,
  insurance_providers TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Healthcare Appointments
CREATE TABLE IF NOT EXISTS public.chatr_healthcare_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.chatr_healthcare(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Restaurants
CREATE TABLE IF NOT EXISTS public.chatr_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  cuisine_type TEXT[], -- indian, chinese, italian, etc.
  address TEXT,
  city TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT,
  image_url TEXT,
  gallery_images TEXT[],
  rating_average DECIMAL(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  price_range TEXT DEFAULT '$$', -- $, $$, $$$, $$$$
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  delivery_available BOOLEAN DEFAULT true,
  delivery_fee INTEGER DEFAULT 0,
  min_order_amount INTEGER DEFAULT 0,
  opening_time TIME,
  closing_time TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Menu Items
CREATE TABLE IF NOT EXISTS public.chatr_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.chatr_restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  category TEXT, -- starters, main course, desserts, beverages
  image_url TEXT,
  is_vegetarian BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  is_spicy BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  preparation_time INTEGER, -- in minutes
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Food Orders
CREATE TABLE IF NOT EXISTS public.chatr_food_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID REFERENCES public.chatr_restaurants(id),
  items JSONB NOT NULL, -- [{item_id, name, quantity, price}]
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  delivery_address TEXT,
  delivery_instructions TEXT,
  status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, out_for_delivery, delivered, cancelled
  payment_method TEXT DEFAULT 'cod', -- cod, online, wallet
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Local Deals
CREATE TABLE IF NOT EXISTS public.chatr_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- jobs, healthcare, food, services, shopping
  original_price INTEGER,
  deal_price INTEGER,
  discount_percent INTEGER,
  coupon_code TEXT,
  image_url TEXT,
  terms_conditions TEXT,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true,
  max_redemptions INTEGER,
  current_redemptions INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Search Cache (for rate limiting Google API)
CREATE TABLE IF NOT EXISTS public.chatr_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,
  query TEXT NOT NULL,
  results JSONB,
  source TEXT DEFAULT 'google', -- google, duckduckgo, cached
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours'
);

-- API Usage Tracking
CREATE TABLE IF NOT EXISTS public.chatr_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 10000,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(api_name, date)
);

-- Enable RLS
ALTER TABLE public.chatr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_healthcare ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_healthcare_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_api_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Jobs
CREATE POLICY "Jobs are viewable by everyone" ON public.chatr_jobs FOR SELECT USING (is_active = true);
CREATE POLICY "Users can create jobs" ON public.chatr_jobs FOR INSERT WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Employers can update own jobs" ON public.chatr_jobs FOR UPDATE USING (auth.uid() = employer_id);
CREATE POLICY "Employers can delete own jobs" ON public.chatr_jobs FOR DELETE USING (auth.uid() = employer_id);

-- RLS Policies for Job Applications
CREATE POLICY "Users can view own applications" ON public.chatr_job_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Employers can view applications for their jobs" ON public.chatr_job_applications FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.chatr_jobs WHERE id = job_id AND employer_id = auth.uid()));
CREATE POLICY "Users can apply for jobs" ON public.chatr_job_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Employers can update application status" ON public.chatr_job_applications FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.chatr_jobs WHERE id = job_id AND employer_id = auth.uid()));

-- RLS Policies for Healthcare
CREATE POLICY "Healthcare providers are viewable by everyone" ON public.chatr_healthcare FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage healthcare" ON public.chatr_healthcare FOR ALL USING (auth.uid() = owner_id);

-- RLS Policies for Healthcare Appointments
CREATE POLICY "Users can view own appointments" ON public.chatr_healthcare_appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Providers can view their appointments" ON public.chatr_healthcare_appointments FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.chatr_healthcare WHERE id = provider_id AND owner_id = auth.uid()));
CREATE POLICY "Users can create appointments" ON public.chatr_healthcare_appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own appointments" ON public.chatr_healthcare_appointments FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Restaurants
CREATE POLICY "Restaurants are viewable by everyone" ON public.chatr_restaurants FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage restaurants" ON public.chatr_restaurants FOR ALL USING (auth.uid() = owner_id);

-- RLS Policies for Menu Items
CREATE POLICY "Menu items are viewable by everyone" ON public.chatr_menu_items FOR SELECT USING (true);
CREATE POLICY "Restaurant owners can manage menu" ON public.chatr_menu_items FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.chatr_restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));

-- RLS Policies for Food Orders
CREATE POLICY "Users can view own orders" ON public.chatr_food_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Restaurant owners can view their orders" ON public.chatr_food_orders FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.chatr_restaurants WHERE id = restaurant_id AND owner_id = auth.uid()));
CREATE POLICY "Users can create orders" ON public.chatr_food_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON public.chatr_food_orders FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Deals
CREATE POLICY "Active deals are viewable by everyone" ON public.chatr_deals FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "Merchants can manage own deals" ON public.chatr_deals FOR ALL USING (auth.uid() = merchant_id);

-- RLS Policies for Search Cache (service role only)
CREATE POLICY "Search cache is readable by everyone" ON public.chatr_search_cache FOR SELECT USING (true);

-- RLS Policies for API Usage (service role only)
CREATE POLICY "API usage is readable by everyone" ON public.chatr_api_usage FOR SELECT USING (true);

-- Functions
CREATE OR REPLACE FUNCTION public.increment_job_views(job_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chatr_jobs SET views_count = views_count + 1 WHERE id = job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_api_limit(api TEXT, daily_max INTEGER DEFAULT 10000)
RETURNS JSONB AS $$
DECLARE
  current_usage INTEGER;
  result JSONB;
BEGIN
  INSERT INTO public.chatr_api_usage (api_name, date, request_count, daily_limit)
  VALUES (api, CURRENT_DATE, 1, daily_max)
  ON CONFLICT (api_name, date) 
  DO UPDATE SET request_count = public.chatr_api_usage.request_count + 1
  RETURNING request_count INTO current_usage;
  
  result := jsonb_build_object(
    'current', current_usage,
    'limit', daily_max,
    'remaining', daily_max - current_usage,
    'allowed', current_usage <= (daily_max * 0.9)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chatr_jobs_location ON public.chatr_jobs(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_chatr_jobs_category ON public.chatr_jobs(category);
CREATE INDEX IF NOT EXISTS idx_chatr_healthcare_type ON public.chatr_healthcare(provider_type);
CREATE INDEX IF NOT EXISTS idx_chatr_healthcare_location ON public.chatr_healthcare(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_chatr_restaurants_location ON public.chatr_restaurants(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_chatr_deals_category ON public.chatr_deals(category);
CREATE INDEX IF NOT EXISTS idx_chatr_search_cache_hash ON public.chatr_search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_chatr_search_cache_expires ON public.chatr_search_cache(expires_at);