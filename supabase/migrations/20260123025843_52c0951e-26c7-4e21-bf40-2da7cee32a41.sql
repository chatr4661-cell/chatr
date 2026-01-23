-- Merchant profiles for UPI ID storage
CREATE TABLE public.merchant_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  upi_id TEXT NOT NULL,
  business_name TEXT,
  business_type TEXT DEFAULT 'kirana',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dhandha transactions tracking
CREATE TABLE public.dhandha_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  fee_coins INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, expired
  upi_link TEXT NOT NULL,
  voice_input TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dhandha_transactions ENABLE ROW LEVEL SECURITY;

-- Merchant profiles policies
CREATE POLICY "Users can view their own merchant profile"
ON public.merchant_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own merchant profile"
ON public.merchant_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own merchant profile"
ON public.merchant_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Dhandha transactions policies
CREATE POLICY "Merchants can view their transactions"
ON public.dhandha_transactions FOR SELECT
USING (merchant_id IN (SELECT id FROM public.merchant_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can create transactions"
ON public.dhandha_transactions FOR INSERT
WITH CHECK (merchant_id IN (SELECT id FROM public.merchant_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can update their transactions"
ON public.dhandha_transactions FOR UPDATE
USING (merchant_id IN (SELECT id FROM public.merchant_profiles WHERE user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_dhandha_transactions_merchant ON public.dhandha_transactions(merchant_id);
CREATE INDEX idx_dhandha_transactions_status ON public.dhandha_transactions(status);
CREATE INDEX idx_dhandha_transactions_created ON public.dhandha_transactions(created_at DESC);

-- Updated at trigger
CREATE TRIGGER update_merchant_profiles_updated_at
BEFORE UPDATE ON public.merchant_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();