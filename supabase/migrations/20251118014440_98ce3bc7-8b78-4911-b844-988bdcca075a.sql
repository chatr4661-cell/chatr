-- Drop existing tables
DROP TABLE IF EXISTS booking_status_updates CASCADE;
DROP TABLE IF EXISTS service_chat_messages CASCADE;
DROP TABLE IF EXISTS provider_payouts CASCADE;
DROP TABLE IF EXISTS admin_action_logs CASCADE;
DROP TABLE IF EXISTS service_memberships CASCADE;
DROP TABLE IF EXISTS service_reviews CASCADE;
DROP TABLE IF EXISTS service_bookings CASCADE;
DROP TABLE IF EXISTS provider_availability CASCADE;
DROP TABLE IF EXISTS service_coupons CASCADE;
DROP TABLE IF EXISTS service_bundles CASCADE;
DROP TABLE IF EXISTS provider_services CASCADE;
DROP TABLE IF EXISTS service_providers CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;

-- CHATR Local Services Marketplace

CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  parent_id UUID,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE service_categories ADD CONSTRAINT fk_parent_category FOREIGN KEY (parent_id) REFERENCES service_categories(id);

CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_name TEXT NOT NULL,
  description TEXT,
  profile_image_url TEXT,
  experience_years INTEGER,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  aadhaar_number TEXT,
  pan_number TEXT,
  aadhaar_document_url TEXT,
  pan_document_url TEXT,
  other_documents JSONB DEFAULT '[]',
  is_online BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  rating_average DECIMAL(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  commission_percentage DECIMAL(5, 2) DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id),
  service_name TEXT NOT NULL,
  description TEXT,
  pricing_model TEXT DEFAULT 'fixed' CHECK (pricing_model IN ('fixed', 'hourly', 'per_sqft', 'on_call', 'quote')),
  base_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'INR',
  duration_minutes INTEGER,
  pricing_tiers JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE,
  customer_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  service_id UUID NOT NULL REFERENCES provider_services(id),
  category_id UUID NOT NULL REFERENCES service_categories(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  service_address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  contact_phone TEXT,
  special_instructions TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'on_the_way', 'started', 'completed', 'cancelled', 'refunded')),
  pricing_details JSONB,
  subtotal DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  commission_amount DECIMAL(10, 2),
  provider_earnings DECIMAL(10, 2),
  coupon_code TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_transaction_id TEXT,
  accepted_at TIMESTAMPTZ,
  reached_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  before_photos JSONB DEFAULT '[]',
  after_photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES service_bookings(id),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  customer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  photos JSONB DEFAULT '[]',
  provider_response TEXT,
  provider_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slots JSONB NOT NULL DEFAULT '[]',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, date)
);

CREATE TABLE service_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  max_discount_amount DECIMAL(10, 2),
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  applicable_categories UUID[] DEFAULT '{}',
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE service_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  bundle_type TEXT DEFAULT 'combo' CHECK (bundle_type IN ('combo', 'membership', 'subscription')),
  included_services JSONB NOT NULL,
  original_price DECIMAL(10, 2),
  bundle_price DECIMAL(10, 2) NOT NULL,
  validity_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE service_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message_text TEXT,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE provider_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_earnings DECIMAL(10, 2) NOT NULL,
  commission_deducted DECIMAL(10, 2) NOT NULL,
  net_payout DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_method TEXT,
  payment_reference TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE booking_status_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  notes TEXT,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE service_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_name TEXT NOT NULL,
  plan_type TEXT DEFAULT 'monthly' CHECK (plan_type IN ('monthly', 'quarterly', 'yearly')),
  price DECIMAL(10, 2) NOT NULL,
  benefits JSONB NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_service_categories_parent ON service_categories(parent_id);
CREATE INDEX idx_service_providers_location ON service_providers(latitude, longitude);
CREATE INDEX idx_service_providers_user ON service_providers(user_id);
CREATE INDEX idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX idx_provider_services_category ON provider_services(category_id);
CREATE INDEX idx_service_bookings_customer ON service_bookings(customer_id);
CREATE INDEX idx_service_bookings_provider ON service_bookings(provider_id);
CREATE INDEX idx_service_bookings_status ON service_bookings(status);
CREATE INDEX idx_service_reviews_provider ON service_reviews(provider_id);
CREATE INDEX idx_service_chat_messages_booking ON service_chat_messages(booking_id);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON service_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active providers" ON service_providers FOR SELECT USING (is_active = true AND is_verified = true);
CREATE POLICY "Users can create provider profile" ON service_providers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Providers can update own profile" ON service_providers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active services" ON provider_services FOR SELECT USING (is_active = true);
CREATE POLICY "Providers can manage own services" ON provider_services FOR ALL USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));
CREATE POLICY "Customers can view their bookings" ON service_bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Providers can view their bookings" ON service_bookings FOR SELECT USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));
CREATE POLICY "Customers can create bookings" ON service_bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can update their bookings" ON service_bookings FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Providers can update assigned bookings" ON service_bookings FOR UPDATE USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can view reviews" ON service_reviews FOR SELECT USING (true);
CREATE POLICY "Customers can create reviews" ON service_reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Anyone can view availability" ON provider_availability FOR SELECT USING (true);
CREATE POLICY "Providers can manage own availability" ON provider_availability FOR ALL USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can view active coupons" ON service_coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active bundles" ON service_bundles FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their chats" ON service_chat_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON service_chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Providers can view own payouts" ON provider_payouts FOR SELECT USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));
CREATE POLICY "System can create logs" ON admin_action_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view booking updates" ON booking_status_updates FOR SELECT USING (booking_id IN (SELECT id FROM service_bookings WHERE customer_id = auth.uid() OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())));
CREATE POLICY "Providers can create updates" ON booking_status_updates FOR INSERT WITH CHECK (auth.uid() = updated_by);
CREATE POLICY "Users can view own memberships" ON service_memberships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create memberships" ON service_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_provider_rating() RETURNS TRIGGER AS $$
BEGIN
  UPDATE service_providers SET rating_average = (SELECT AVG(rating) FROM service_reviews WHERE provider_id = NEW.provider_id), rating_count = (SELECT COUNT(*) FROM service_reviews WHERE provider_id = NEW.provider_id) WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_provider_rating_trigger AFTER INSERT OR UPDATE ON service_reviews FOR EACH ROW EXECUTE FUNCTION update_provider_rating();

CREATE OR REPLACE FUNCTION generate_booking_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_number IS NULL THEN
    NEW.booking_number := 'BK' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_booking_number_trigger BEFORE INSERT ON service_bookings FOR EACH ROW EXECUTE FUNCTION generate_booking_number();

CREATE OR REPLACE FUNCTION calculate_booking_earnings() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.commission_amount := NEW.total_amount * (SELECT commission_percentage FROM service_providers WHERE id = NEW.provider_id) / 100;
    NEW.provider_earnings := NEW.total_amount - NEW.commission_amount;
    UPDATE service_providers SET total_bookings = total_bookings + 1, total_earnings = total_earnings + NEW.provider_earnings WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER calculate_booking_earnings_trigger BEFORE UPDATE ON service_bookings FOR EACH ROW EXECUTE FUNCTION calculate_booking_earnings();

ALTER PUBLICATION supabase_realtime ADD TABLE service_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE booking_status_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE service_chat_messages;