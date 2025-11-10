-- Create seller transactions table
CREATE TABLE IF NOT EXISTS public.seller_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  booking_id UUID,
  service_id UUID,
  amount NUMERIC(10, 2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earning', 'withdrawal', 'refund', 'fee')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_transactions ENABLE ROW LEVEL SECURITY;

-- Sellers can view their transactions
CREATE POLICY "Sellers can view their transactions"
ON public.seller_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.home_service_providers hsp
    WHERE hsp.id = seller_transactions.seller_id
    AND hsp.user_id = auth.uid()
  )
);

-- Create withdrawal requests table
CREATE TABLE IF NOT EXISTS public.seller_withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  bank_account_last4 TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  transaction_id TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.seller_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Sellers can create withdrawal requests
CREATE POLICY "Sellers can create withdrawal requests"
ON public.seller_withdrawal_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.home_service_providers hsp
    WHERE hsp.id = seller_withdrawal_requests.seller_id
    AND hsp.user_id = auth.uid()
  )
);

-- Sellers can view their withdrawal requests
CREATE POLICY "Sellers can view their withdrawal requests"
ON public.seller_withdrawal_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.home_service_providers hsp
    WHERE hsp.id = seller_withdrawal_requests.seller_id
    AND hsp.user_id = auth.uid()
  )
);

-- Sellers can cancel their pending requests
CREATE POLICY "Sellers can cancel pending requests"
ON public.seller_withdrawal_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.home_service_providers hsp
    WHERE hsp.id = seller_withdrawal_requests.seller_id
    AND hsp.user_id = auth.uid()
  )
  AND status = 'pending'
);

-- Create seller invoices table
CREATE TABLE IF NOT EXISTS public.seller_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  withdrawal_request_id UUID REFERENCES public.seller_withdrawal_requests(id),
  invoice_number TEXT NOT NULL UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  pdf_url TEXT,
  status TEXT DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'void'))
);

-- Enable RLS
ALTER TABLE public.seller_invoices ENABLE ROW LEVEL SECURITY;

-- Sellers can view their invoices
CREATE POLICY "Sellers can view their invoices"
ON public.seller_invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.home_service_providers hsp
    WHERE hsp.id = seller_invoices.seller_id
    AND hsp.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seller_transactions_seller_id ON public.seller_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_created_at ON public.seller_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_seller_id ON public.seller_withdrawal_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.seller_withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_seller_invoices_seller_id ON public.seller_invoices(seller_id);