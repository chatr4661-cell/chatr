-- Add public_key column to profiles for E2E encryption
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Add is_verified column to profiles for KYC status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add reviewed_by column to kyc_documents if missing
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

-- Update kyc_documents to use submitted_at as alias for created_at
-- (The table already has created_at, so we use that)