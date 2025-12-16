-- Add approval workflow fields to chatr_plus_sellers
ALTER TABLE public.chatr_plus_sellers 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'not_submitted',
ADD COLUMN IF NOT EXISTS gstin VARCHAR(50),
ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '[]'::jsonb;

-- Create seller KYC documents table for file references
CREATE TABLE IF NOT EXISTS public.seller_kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.chatr_plus_sellers(id) ON DELETE CASCADE NOT NULL,
  document_type VARCHAR(50) NOT NULL, -- 'pan', 'aadhar', 'gstin', 'business_registration', 'address_proof'
  document_url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.seller_kyc_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for seller_kyc_documents
CREATE POLICY "Sellers can view own KYC documents"
ON public.seller_kyc_documents FOR SELECT
USING (
  seller_id IN (
    SELECT id FROM public.chatr_plus_sellers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Sellers can insert own KYC documents"
ON public.seller_kyc_documents FOR INSERT
WITH CHECK (
  seller_id IN (
    SELECT id FROM public.chatr_plus_sellers WHERE user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_seller_kyc_seller_id ON public.seller_kyc_documents(seller_id);
CREATE INDEX IF NOT EXISTS idx_sellers_approval_status ON public.chatr_plus_sellers(approval_status);
CREATE INDEX IF NOT EXISTS idx_sellers_is_verified ON public.chatr_plus_sellers(is_verified);