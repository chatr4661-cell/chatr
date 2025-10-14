-- Create service categories table
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create home service providers table
CREATE TABLE IF NOT EXISTS public.home_service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  business_name TEXT NOT NULL,
  category_id UUID REFERENCES service_categories(id),
  description TEXT,
  hourly_rate NUMERIC NOT NULL,
  availability JSONB DEFAULT '[]'::jsonb,
  service_areas JSONB DEFAULT '[]'::jsonb,
  rating_average NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  phone_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create home service bookings table
CREATE TABLE IF NOT EXISTS public.home_service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES home_service_providers(id) NOT NULL,
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  service_type TEXT NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_hours INTEGER DEFAULT 2,
  address TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  total_cost NUMERIC,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create home service reviews table
CREATE TABLE IF NOT EXISTS public.home_service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES home_service_providers(id) NOT NULL,
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  booking_id UUID REFERENCES home_service_bookings(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_service_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_categories
CREATE POLICY "Anyone can view service categories"
  ON public.service_categories FOR SELECT
  USING (true);

-- RLS Policies for home_service_providers
CREATE POLICY "Anyone can view verified providers"
  ON public.home_service_providers FOR SELECT
  USING (verified = true);

CREATE POLICY "Providers can manage their profile"
  ON public.home_service_providers FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for home_service_bookings
CREATE POLICY "Customers can view their bookings"
  ON public.home_service_bookings FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Providers can view their bookings"
  ON public.home_service_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM home_service_providers
    WHERE id = home_service_bookings.provider_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Customers can create bookings"
  ON public.home_service_bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers and providers can update bookings"
  ON public.home_service_bookings FOR UPDATE
  USING (
    auth.uid() = customer_id OR
    EXISTS (
      SELECT 1 FROM home_service_providers
      WHERE id = home_service_bookings.provider_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for home_service_reviews
CREATE POLICY "Anyone can view reviews"
  ON public.home_service_reviews FOR SELECT
  USING (true);

CREATE POLICY "Customers can create reviews"
  ON public.home_service_reviews FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Function to update provider rating
CREATE OR REPLACE FUNCTION update_home_service_provider_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE home_service_providers 
  SET 
    rating_average = (SELECT AVG(rating) FROM home_service_reviews WHERE provider_id = NEW.provider_id),
    rating_count = (SELECT COUNT(*) FROM home_service_reviews WHERE provider_id = NEW.provider_id)
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$;

-- Trigger for rating updates
CREATE TRIGGER update_home_service_provider_rating_trigger
AFTER INSERT OR UPDATE ON home_service_reviews
FOR EACH ROW
EXECUTE FUNCTION update_home_service_provider_rating();

-- Insert service categories
INSERT INTO public.service_categories (name, icon, description) VALUES
  ('Plumbing', '🔧', 'Pipe repairs, installations, and emergency plumbing'),
  ('Electrical', '⚡', 'Electrical repairs, installations, and wiring'),
  ('Carpentry', '🔨', 'Furniture assembly, repairs, and custom woodwork'),
  ('Painting', '🎨', 'Interior and exterior painting services'),
  ('Cleaning', '🧹', 'Home cleaning and deep cleaning services'),
  ('HVAC', '❄️', 'Heating, ventilation, and air conditioning services');

-- Insert sample providers
INSERT INTO public.home_service_providers (business_name, category_id, description, hourly_rate, rating_average, rating_count, completed_jobs, verified, phone_number) VALUES
  ('QuickFix Plumbing', (SELECT id FROM service_categories WHERE name = 'Plumbing'), 'Emergency plumbing services available 24/7. Licensed and insured.', 75, 4.8, 156, 342, true, '+1234567890'),
  ('Spark Electric Co.', (SELECT id FROM service_categories WHERE name = 'Electrical'), 'Certified electricians for residential and commercial work.', 85, 4.9, 203, 487, true, '+1234567891'),
  ('Master Carpenters', (SELECT id FROM service_categories WHERE name = 'Carpentry'), 'Custom woodwork and furniture assembly specialists.', 65, 4.7, 98, 215, true, '+1234567892'),
  ('Color Perfect Painters', (SELECT id FROM service_categories WHERE name = 'Painting'), 'Professional painting with quality guarantee.', 55, 4.6, 134, 298, true, '+1234567893'),
  ('SparkleHome Cleaners', (SELECT id FROM service_categories WHERE name = 'Cleaning'), 'Eco-friendly cleaning products and thorough service.', 45, 4.9, 421, 856, true, '+1234567894'),
  ('CoolAir HVAC', (SELECT id FROM service_categories WHERE name = 'HVAC'), 'Expert HVAC installation, repair, and maintenance.', 90, 4.8, 187, 392, true, '+1234567895');

-- Add Home Service Pro to mini_apps
INSERT INTO public.mini_apps (app_name, description, icon_url, category_id, rating_average, install_count, is_verified, is_active, app_url)
VALUES (
  'Home Service Pro',
  'Book plumbers, electricians, and home repair services instantly',
  '🏠',
  (SELECT id FROM app_categories WHERE name = 'Lifestyle' LIMIT 1),
  4.2,
  0,
  true,
  true,
  '/home-services'
);