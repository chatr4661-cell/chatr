-- Add missing columns to service_providers
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'fixed';

-- Update service_reviews to use review_text instead of comment
ALTER TABLE service_reviews 
ADD COLUMN IF NOT EXISTS review_text TEXT;