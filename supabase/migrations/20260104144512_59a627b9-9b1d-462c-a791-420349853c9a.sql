-- Add address field to profiles for delivery address
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS delivery_address JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.delivery_address IS 'Stores user delivery address for medicine subscriptions';