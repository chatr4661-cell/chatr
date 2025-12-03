-- UPI Payments tracking table
CREATE TABLE public.upi_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  order_id UUID,
  order_type TEXT NOT NULL, -- 'food', 'healthcare', 'deals', 'service'
  seller_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  upi_reference TEXT, -- UTR number from screenshot
  payment_screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, submitted, verified, rejected, settled
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  settlement_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upi_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON public.upi_payments
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create payments
CREATE POLICY "Users can create payments" ON public.upi_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their pending payments (submit screenshot)
CREATE POLICY "Users can update pending payments" ON public.upi_payments
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Seller settlements tracking
CREATE TABLE public.seller_settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  payment_id UUID REFERENCES public.upi_payments(id),
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, settled
  settled_at TIMESTAMPTZ,
  settlement_reference TEXT,
  settlement_method TEXT, -- 'upi', 'bank_transfer'
  seller_upi_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_settlements ENABLE ROW LEVEL SECURITY;

-- Sellers can view their settlements
CREATE POLICY "Sellers can view own settlements" ON public.seller_settlements
  FOR SELECT USING (auth.uid() = seller_id);

-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for payment screenshots
CREATE POLICY "Users can upload payment screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own payment screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);