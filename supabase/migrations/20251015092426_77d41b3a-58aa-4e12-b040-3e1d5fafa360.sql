-- Add broadcasts_enabled and notification preferences to business_profiles
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS broadcasts_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
  "email_notifications": true,
  "sms_notifications": false,
  "new_lead_alerts": true,
  "daily_digest": true,
  "order_notifications": true,
  "review_notifications": true
}'::jsonb;

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  monthly_price numeric NOT NULL DEFAULT 0,
  yearly_price numeric,
  features jsonb DEFAULT '{}'::jsonb,
  limits jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "Anyone can view active plans"
ON subscription_plans
FOR SELECT
USING (is_active = true);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, monthly_price, yearly_price, features, limits, display_order)
VALUES 
  (
    'Starter',
    'Perfect for small businesses getting started',
    499,
    4990,
    '{"broadcasts": true, "catalog": true, "groups": true, "analytics": "basic", "support": "email"}'::jsonb,
    '{"max_broadcasts": 50, "max_products": 20, "max_groups": 2, "team_members": 2}'::jsonb,
    1
  ),
  (
    'Professional',
    'For growing businesses with advanced needs',
    1499,
    14990,
    '{"broadcasts": true, "catalog": true, "groups": true, "analytics": "advanced", "support": "priority", "automation": true, "integrations": true}'::jsonb,
    '{"max_broadcasts": 500, "max_products": 100, "max_groups": 10, "team_members": 10}'::jsonb,
    2
  ),
  (
    'Enterprise',
    'Custom solution for large organizations',
    4999,
    49990,
    '{"broadcasts": true, "catalog": true, "groups": true, "analytics": "premium", "support": "dedicated", "automation": true, "integrations": true, "white_label": true, "api_access": true}'::jsonb,
    '{"max_broadcasts": -1, "max_products": -1, "max_groups": -1, "team_members": -1}'::jsonb,
    3
  )
ON CONFLICT DO NOTHING;