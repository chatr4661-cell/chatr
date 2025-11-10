-- Add pricing_tiers and availability columns to chatr_plus_services table
ALTER TABLE chatr_plus_services 
ADD COLUMN IF NOT EXISTS pricing_tiers jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS availability jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN chatr_plus_services.pricing_tiers IS 'Array of pricing tier objects with name, description, price, and features';
COMMENT ON COLUMN chatr_plus_services.availability IS 'Weekly availability schedule with day, enabled status, start time, and end time';