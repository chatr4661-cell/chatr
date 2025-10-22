-- Plugin System Tables
CREATE TABLE IF NOT EXISTS user_installed_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES mini_apps(id) ON DELETE CASCADE,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  UNIQUE(user_id, app_id)
);

-- Micro-payments with Chatr Coins
CREATE TABLE IF NOT EXISTS coin_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id UUID REFERENCES mini_apps(id) ON DELETE SET NULL,
  merchant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('app_purchase', 'in_app_purchase', 'tip', 'service', 'subscription')),
  description TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- App Builder Projects (Chatr Studio)
CREATE TABLE IF NOT EXISTS app_builder_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name VARCHAR(100) NOT NULL,
  description TEXT,
  app_type VARCHAR(50) DEFAULT 'custom' CHECK (app_type IN ('custom', 'resume', 'portfolio', 'store', 'blog', 'landing')),
  config JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  published_app_id UUID REFERENCES mini_apps(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Food Ordering System
CREATE TABLE IF NOT EXISTS food_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cuisine_type VARCHAR(50),
  avatar_url TEXT,
  cover_image_url TEXT,
  is_open BOOLEAN DEFAULT true,
  delivery_time_min INTEGER DEFAULT 30,
  delivery_time_max INTEGER DEFAULT 60,
  min_order_amount INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS food_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES food_vendors(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  image_url TEXT,
  category VARCHAR(50),
  is_vegetarian BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS food_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES food_vendors(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  total_amount INTEGER NOT NULL,
  delivery_address TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Local Deals System
CREATE TABLE IF NOT EXISTS local_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  original_price INTEGER NOT NULL,
  discounted_price INTEGER NOT NULL,
  discount_percentage INTEGER GENERATED ALWAYS AS (ROUND(((original_price - discounted_price)::DECIMAL / original_price * 100)::NUMERIC, 0)) STORED,
  image_url TEXT,
  category VARCHAR(50),
  location TEXT,
  valid_until TIMESTAMP WITH TIME ZONE,
  max_redemptions INTEGER,
  current_redemptions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deal_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES local_deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  qr_code TEXT,
  UNIQUE(deal_id, user_id)
);

-- Enable RLS
ALTER TABLE user_installed_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_builder_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their installed plugins"
  ON user_installed_plugins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can install plugins"
  ON user_installed_plugins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their plugins"
  ON user_installed_plugins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can uninstall plugins"
  ON user_installed_plugins FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their payments"
  ON coin_payments FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = merchant_id);

CREATE POLICY "Users can create payments"
  ON coin_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their projects"
  ON app_builder_projects FOR SELECT
  USING (auth.uid() = user_id OR is_published = true);

CREATE POLICY "Users can create projects"
  ON app_builder_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their projects"
  ON app_builder_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view active food vendors"
  ON food_vendors FOR SELECT
  USING (true);

CREATE POLICY "Everyone can view menu items"
  ON food_menu_items FOR SELECT
  USING (true);

CREATE POLICY "Users can create orders"
  ON food_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their orders"
  ON food_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view active deals"
  ON local_deals FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can redeem deals"
  ON deal_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their redemptions"
  ON deal_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- Function to process coin payment
CREATE OR REPLACE FUNCTION process_coin_payment(
  p_user_id UUID,
  p_amount INTEGER,
  p_merchant_id UUID,
  p_payment_type VARCHAR,
  p_description TEXT,
  p_app_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_balance INTEGER;
  v_payment_id UUID;
BEGIN
  -- Check user balance
  SELECT balance INTO v_user_balance
  FROM user_points
  WHERE user_id = p_user_id;
  
  IF v_user_balance IS NULL OR v_user_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient Chatr Coins';
  END IF;
  
  -- Deduct from user
  UPDATE user_points
  SET balance = balance - p_amount
  WHERE user_id = p_user_id;
  
  -- Add to merchant if specified
  IF p_merchant_id IS NOT NULL THEN
    UPDATE user_points
    SET balance = balance + p_amount
    WHERE user_id = p_merchant_id;
  END IF;
  
  -- Record transaction
  INSERT INTO point_transactions (user_id, amount, transaction_type, source, description)
  VALUES (p_user_id, -p_amount, 'spend', p_payment_type, p_description);
  
  IF p_merchant_id IS NOT NULL THEN
    INSERT INTO point_transactions (user_id, amount, transaction_type, source, description)
    VALUES (p_merchant_id, p_amount, 'earn', p_payment_type, 'Payment received: ' || p_description);
  END IF;
  
  -- Create payment record
  INSERT INTO coin_payments (user_id, app_id, merchant_id, amount, payment_type, description, status)
  VALUES (p_user_id, p_app_id, p_merchant_id, p_amount, p_payment_type, p_description, 'completed')
  RETURNING id INTO v_payment_id;
  
  RETURN v_payment_id;
END;
$$;

-- Indexes for performance
CREATE INDEX idx_installed_plugins_user ON user_installed_plugins(user_id);
CREATE INDEX idx_coin_payments_user ON coin_payments(user_id);
CREATE INDEX idx_coin_payments_merchant ON coin_payments(merchant_id);
CREATE INDEX idx_food_orders_user ON food_orders(user_id);
CREATE INDEX idx_food_orders_status ON food_orders(status);
CREATE INDEX idx_local_deals_active ON local_deals(is_active, valid_until);

-- Trigger for updated_at
CREATE TRIGGER update_app_builder_projects_updated_at
  BEFORE UPDATE ON app_builder_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();