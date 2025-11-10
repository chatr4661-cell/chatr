-- Create Chatr+ subscription plans table
CREATE TABLE IF NOT EXISTS public.chatr_plus_user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'free', -- 'free', 'premium'
  amount INTEGER NOT NULL DEFAULT 0, -- in rupees
  status VARCHAR(20) NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'expired'
  started_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create seller registrations table
CREATE TABLE IF NOT EXISTS public.chatr_plus_sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100) NOT NULL, -- 'food', 'healthcare', 'home_services', 'jobs', etc.
  description TEXT,
  logo_url TEXT,
  phone_number VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  subscription_plan VARCHAR(50) NOT NULL DEFAULT 'basic', -- 'basic', 'featured', 'premium'
  subscription_amount INTEGER NOT NULL DEFAULT 99,
  subscription_status VARCHAR(20) NOT NULL DEFAULT 'active',
  subscription_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  rating_average DECIMAL(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service categories table
CREATE TABLE IF NOT EXISTS public.chatr_plus_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_name VARCHAR(50),
  color_scheme VARCHAR(50),
  parent_category_id UUID REFERENCES public.chatr_plus_categories(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS public.chatr_plus_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.chatr_plus_sellers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.chatr_plus_categories(id),
  service_name VARCHAR(255) NOT NULL,
  description TEXT,
  price_type VARCHAR(20) NOT NULL DEFAULT 'fixed', -- 'fixed', 'starting_from', 'hourly', 'custom'
  price INTEGER, -- in rupees
  duration_minutes INTEGER,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  availability JSONB DEFAULT '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": true, "sunday": true}'::jsonb,
  service_area VARCHAR(255), -- city or area coverage
  rating_average DECIMAL(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.chatr_plus_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.chatr_plus_services(id),
  seller_id UUID NOT NULL REFERENCES public.chatr_plus_sellers(id),
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_address TEXT,
  special_instructions TEXT,
  total_amount INTEGER NOT NULL,
  platform_fee INTEGER DEFAULT 0,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  payment_method VARCHAR(50),
  payment_transaction_id UUID,
  cancelled_by VARCHAR(50), -- 'user', 'seller', 'system'
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.chatr_plus_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.chatr_plus_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.chatr_plus_services(id),
  seller_id UUID NOT NULL REFERENCES public.chatr_plus_sellers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  images TEXT[],
  is_verified BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

-- Create payment transactions table
CREATE TABLE IF NOT EXISTS public.chatr_plus_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'subscription', 'booking', 'wallet_topup', 'refund', 'cashback'
  amount INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'refunded'
  payment_method VARCHAR(50), -- 'upi', 'card', 'wallet', 'net_banking'
  payment_gateway_ref VARCHAR(255),
  booking_id UUID REFERENCES public.chatr_plus_bookings(id),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet table
CREATE TABLE IF NOT EXISTS public.chatr_plus_wallet (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  cashback_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default categories
INSERT INTO public.chatr_plus_categories (name, slug, description, icon_name, color_scheme, display_order) VALUES
  ('Food & Dining', 'food', 'Order from restaurants, home chefs, and local eateries', 'UtensilsCrossed', 'orange', 1),
  ('Home Services', 'home-services', 'Plumbers, electricians, cleaners, and repairs', 'Wrench', 'blue', 2),
  ('Healthcare', 'healthcare', 'Doctors, clinics, labs, and consultations', 'Stethoscope', 'green', 3),
  ('Beauty & Wellness', 'beauty-wellness', 'Salons, spas, and personal care', 'Sparkles', 'pink', 4),
  ('Local Jobs', 'jobs', 'Hire helpers, drivers, and gig workers', 'Briefcase', 'purple', 5),
  ('Education', 'education', 'Tutors, coaching, and skill training', 'GraduationCap', 'indigo', 6),
  ('Business Tools', 'business', 'Mini-apps, listings, and dashboards', 'Store', 'teal', 7)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS
ALTER TABLE public.chatr_plus_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_plus_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_plus_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_plus_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_plus_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_plus_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_plus_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_plus_wallet ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user subscriptions
CREATE POLICY "Users can view their own subscription" ON public.chatr_plus_user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscription" ON public.chatr_plus_user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.chatr_plus_user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for sellers
CREATE POLICY "Anyone can view active sellers" ON public.chatr_plus_sellers FOR SELECT USING (is_active = true);
CREATE POLICY "Users can create seller profile" ON public.chatr_plus_sellers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sellers can update their own profile" ON public.chatr_plus_sellers FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for categories
CREATE POLICY "Anyone can view active categories" ON public.chatr_plus_categories FOR SELECT USING (is_active = true);

-- RLS Policies for services
CREATE POLICY "Anyone can view active services" ON public.chatr_plus_services FOR SELECT USING (is_active = true);
CREATE POLICY "Sellers can create services" ON public.chatr_plus_services FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.chatr_plus_sellers WHERE id = seller_id AND user_id = auth.uid())
);
CREATE POLICY "Sellers can update their services" ON public.chatr_plus_services FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.chatr_plus_sellers WHERE id = seller_id AND user_id = auth.uid())
);

-- RLS Policies for bookings
CREATE POLICY "Users can view their bookings" ON public.chatr_plus_bookings FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.chatr_plus_sellers WHERE id = seller_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create bookings" ON public.chatr_plus_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users and sellers can update bookings" ON public.chatr_plus_bookings FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.chatr_plus_sellers WHERE id = seller_id AND user_id = auth.uid())
);

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews" ON public.chatr_plus_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for their bookings" ON public.chatr_plus_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view their transactions" ON public.chatr_plus_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create transactions" ON public.chatr_plus_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for wallet
CREATE POLICY "Users can view their wallet" ON public.chatr_plus_wallet FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their wallet" ON public.chatr_plus_wallet FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their wallet" ON public.chatr_plus_wallet FOR UPDATE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_chatr_plus_user_subscriptions_updated_at BEFORE UPDATE ON public.chatr_plus_user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_chatr_plus_sellers_updated_at BEFORE UPDATE ON public.chatr_plus_sellers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_chatr_plus_services_updated_at BEFORE UPDATE ON public.chatr_plus_services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_chatr_plus_bookings_updated_at BEFORE UPDATE ON public.chatr_plus_bookings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_chatr_plus_wallet_updated_at BEFORE UPDATE ON public.chatr_plus_wallet FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to update service ratings
CREATE OR REPLACE FUNCTION public.update_chatr_plus_service_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chatr_plus_services 
  SET 
    rating_average = (SELECT AVG(rating) FROM public.chatr_plus_reviews WHERE service_id = NEW.service_id),
    rating_count = (SELECT COUNT(*) FROM public.chatr_plus_reviews WHERE service_id = NEW.service_id)
  WHERE id = NEW.service_id;
  
  UPDATE public.chatr_plus_sellers 
  SET 
    rating_average = (SELECT AVG(rating) FROM public.chatr_plus_reviews WHERE seller_id = NEW.seller_id),
    rating_count = (SELECT COUNT(*) FROM public.chatr_plus_reviews WHERE seller_id = NEW.seller_id)
  WHERE id = NEW.seller_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_service_rating_trigger AFTER INSERT ON public.chatr_plus_reviews FOR EACH ROW EXECUTE FUNCTION public.update_chatr_plus_service_rating();

-- Function to process Chatr+ payments
CREATE OR REPLACE FUNCTION public.process_chatr_plus_payment(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type VARCHAR,
  p_payment_method VARCHAR,
  p_booking_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_wallet_balance INTEGER;
BEGIN
  -- Check wallet balance if payment method is wallet
  IF p_payment_method = 'wallet' THEN
    SELECT balance INTO v_wallet_balance FROM public.chatr_plus_wallet WHERE user_id = p_user_id;
    
    IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    
    -- Deduct from wallet
    UPDATE public.chatr_plus_wallet
    SET balance = balance - p_amount,
        total_spent = total_spent + p_amount
    WHERE user_id = p_user_id;
  END IF;
  
  -- Create transaction record
  INSERT INTO public.chatr_plus_transactions (
    user_id, transaction_type, amount, status, payment_method, booking_id, description
  )
  VALUES (
    p_user_id, p_transaction_type, p_amount, 'success', p_payment_method, p_booking_id, p_description
  )
  RETURNING id INTO v_transaction_id;
  
  -- Update booking payment status if applicable
  IF p_booking_id IS NOT NULL THEN
    UPDATE public.chatr_plus_bookings
    SET payment_status = 'paid',
        payment_transaction_id = v_transaction_id
    WHERE id = p_booking_id;
  END IF;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;