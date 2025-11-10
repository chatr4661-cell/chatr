-- Universal Search & Subscription System for Chatr.chat

-- 1. User Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.chatr_user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  price DECIMAL(10, 2) NOT NULL DEFAULT 99.00,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT true,
  payment_method VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Seller Subscription Plans Table (₹99, ₹499, ₹1,999)
CREATE TABLE IF NOT EXISTS public.chatr_seller_subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.chatr_plus_sellers(id) ON DELETE CASCADE,
  plan_tier VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'featured', 'premium')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  monthly_price DECIMAL(10, 2) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id)
);

-- 3. ChatrPay Wallet System
CREATE TABLE IF NOT EXISTS public.chatr_wallet (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  cashback_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  total_spent DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  total_earned DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  referral_earnings DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'INR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 4. Wallet Transactions
CREATE TABLE IF NOT EXISTS public.chatr_wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.chatr_wallet(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('credit', 'debit', 'cashback', 'referral', 'refund')),
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  description TEXT,
  reference_type VARCHAR(100),
  reference_id UUID,
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Payment Gateway Integrations
CREATE TABLE IF NOT EXISTS public.chatr_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type VARCHAR(50) NOT NULL CHECK (method_type IN ('upi', 'card', 'wallet', 'netbanking')),
  provider VARCHAR(100),
  upi_id VARCHAR(255),
  card_last_4 VARCHAR(4),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. AI Search History & Analytics
CREATE TABLE IF NOT EXISTS public.chatr_search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  search_intent VARCHAR(100),
  category VARCHAR(100),
  location JSONB,
  results_count INTEGER DEFAULT 0,
  clicked_result_id UUID,
  clicked_result_type VARCHAR(100),
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Transaction Fees & Platform Revenue
CREATE TABLE IF NOT EXISTS public.chatr_platform_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.chatr_plus_bookings(id),
  seller_id UUID REFERENCES public.chatr_plus_sellers(id),
  transaction_amount DECIMAL(15, 2) NOT NULL,
  platform_fee_percent DECIMAL(5, 2) DEFAULT 5.00,
  platform_fee_amount DECIMAL(15, 2) NOT NULL,
  processing_fee_percent DECIMAL(5, 2) DEFAULT 1.50,
  processing_fee_amount DECIMAL(15, 2) NOT NULL,
  total_fee DECIMAL(15, 2) NOT NULL,
  seller_payout DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Subscription Plan Definitions (Pre-populated)
CREATE TABLE IF NOT EXISTS public.chatr_subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type VARCHAR(50) NOT NULL UNIQUE,
  plan_name VARCHAR(255) NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10, 2) NOT NULL,
  yearly_price DECIMAL(10, 2),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_audience VARCHAR(50) CHECK (target_audience IN ('user', 'seller', 'business')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatr_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_seller_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatr_subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for User Subscriptions
CREATE POLICY "Users can view their own subscription" ON public.chatr_user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their subscription" ON public.chatr_user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their subscription" ON public.chatr_user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Seller Subscriptions
CREATE POLICY "Sellers can view their subscription" ON public.chatr_seller_subscription_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chatr_plus_sellers WHERE id = seller_id AND user_id = auth.uid())
);
CREATE POLICY "Sellers can insert their subscription" ON public.chatr_seller_subscription_plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.chatr_plus_sellers WHERE id = seller_id AND user_id = auth.uid())
);
CREATE POLICY "Sellers can update their subscription" ON public.chatr_seller_subscription_plans FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.chatr_plus_sellers WHERE id = seller_id AND user_id = auth.uid())
);

-- RLS Policies for Wallet
CREATE POLICY "Users can view their wallet" ON public.chatr_wallet FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their wallet" ON public.chatr_wallet FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Wallet Transactions
CREATE POLICY "Users can view their transactions" ON public.chatr_wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for Payment Methods
CREATE POLICY "Users can manage their payment methods" ON public.chatr_payment_methods FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for Search History
CREATE POLICY "Users can view their search history" ON public.chatr_search_history FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS for Platform Fees (Sellers and Admins)
CREATE POLICY "Sellers can view their fees" ON public.chatr_platform_fees FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chatr_plus_sellers WHERE id = seller_id AND user_id = auth.uid())
);

-- RLS for Subscription Plans (Public Read)
CREATE POLICY "Anyone can view subscription plans" ON public.chatr_subscription_plans FOR SELECT USING (is_active = true);

-- Triggers for updated_at
CREATE TRIGGER update_chatr_user_subscriptions_updated_at BEFORE UPDATE ON public.chatr_user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_chatr_seller_subscription_plans_updated_at BEFORE UPDATE ON public.chatr_seller_subscription_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_chatr_wallet_updated_at BEFORE UPDATE ON public.chatr_wallet FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_chatr_payment_methods_updated_at BEFORE UPDATE ON public.chatr_payment_methods FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Pre-populate Subscription Plans
INSERT INTO public.chatr_subscription_plans (plan_type, plan_name, description, monthly_price, yearly_price, features, target_audience) VALUES
  ('user_premium', 'Chatr Premium User', 'Unlimited search, bookings, instant chat with providers, rewards & cashback, 24x7 AI Assistant', 99.00, 990.00, 
   '["Unlimited search & bookings", "Instant chat & call with providers", "Rewards & cashback", "24x7 AI Assistant", "Priority support"]'::jsonb, 'user'),
  
  ('seller_basic', 'Basic Listing', 'Basic seller listing with standard features', 99.00, 990.00,
   '["Basic service listing", "Customer inquiries", "Standard analytics", "Up to 5 services"]'::jsonb, 'seller'),
   
  ('seller_featured', 'Featured Seller', 'Featured placement with enhanced visibility', 499.00, 4990.00,
   '["Featured placement", "Unlimited services", "Advanced analytics", "Priority in search", "Custom branding", "AI lead generation"]'::jsonb, 'seller'),
   
  ('seller_premium', 'Premium Partner', 'Premium tier with full features and promotions', 1999.00, 19990.00,
   '["Premium placement", "Unlimited services", "Full analytics dashboard", "AI leads & recommendations", "Promotional campaigns", "Dedicated support", "API access", "Custom integrations"]'::jsonb, 'seller')
ON CONFLICT (plan_type) DO NOTHING;

-- Function to process wallet transaction
CREATE OR REPLACE FUNCTION process_wallet_transaction(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_amount DECIMAL(15, 2),
  p_description TEXT,
  p_reference_type VARCHAR(100) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance DECIMAL(15, 2);
  v_transaction_id UUID;
BEGIN
  -- Get or create wallet
  SELECT id, balance INTO v_wallet_id, v_new_balance
  FROM public.chatr_wallet
  WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.chatr_wallet (user_id, balance)
    VALUES (p_user_id, 0.00)
    RETURNING id, balance INTO v_wallet_id, v_new_balance;
  END IF;
  
  -- Calculate new balance
  IF p_type IN ('credit', 'cashback', 'referral', 'refund') THEN
    v_new_balance := v_new_balance + p_amount;
  ELSIF p_type = 'debit' THEN
    IF v_new_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    v_new_balance := v_new_balance - p_amount;
  END IF;
  
  -- Insert transaction
  INSERT INTO public.chatr_wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, description, reference_type, reference_id
  ) VALUES (
    v_wallet_id, p_user_id, p_type, p_amount, v_new_balance, p_description, p_reference_type, p_reference_id
  ) RETURNING id INTO v_transaction_id;
  
  -- Update wallet balance and stats
  UPDATE public.chatr_wallet
  SET balance = v_new_balance,
      total_spent = CASE WHEN p_type = 'debit' THEN total_spent + p_amount ELSE total_spent END,
      total_earned = CASE WHEN p_type IN ('credit', 'cashback', 'referral') THEN total_earned + p_amount ELSE total_earned END,
      cashback_balance = CASE WHEN p_type = 'cashback' THEN cashback_balance + p_amount ELSE cashback_balance END,
      referral_earnings = CASE WHEN p_type = 'referral' THEN referral_earnings + p_amount ELSE referral_earnings END,
      updated_at = now()
  WHERE id = v_wallet_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON public.chatr_user_subscriptions(user_id);
CREATE INDEX idx_seller_subscriptions_seller_id ON public.chatr_seller_subscription_plans(seller_id);
CREATE INDEX idx_wallet_user_id ON public.chatr_wallet(user_id);
CREATE INDEX idx_wallet_transactions_user_id ON public.chatr_wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON public.chatr_wallet_transactions(wallet_id);
CREATE INDEX idx_search_history_user_id ON public.chatr_search_history(user_id);
CREATE INDEX idx_search_history_category ON public.chatr_search_history(category);
CREATE INDEX idx_platform_fees_seller_id ON public.chatr_platform_fees(seller_id);