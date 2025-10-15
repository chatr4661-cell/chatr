-- Chatr CRM Application Schema
-- Lead management, activities, and sales pipeline

-- CRM Leads table
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  
  -- Lead information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  
  -- Lead status and qualification
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'chat', 'website', 'referral', 'social', 'advertisement', 'other')),
  
  -- Sales details
  deal_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  
  -- Assignment and tracking
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Notes and metadata
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Activities table (calls, meetings, emails, notes)
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  
  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'meeting', 'email', 'note', 'task', 'message')),
  subject TEXT NOT NULL,
  description TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  
  -- Assignment
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Additional metadata
  duration_minutes INTEGER,
  outcome TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Pipelines (customizable sales stages)
CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  stages JSONB NOT NULL DEFAULT '[
    {"name": "New Lead", "order": 1, "color": "blue"},
    {"name": "Contacted", "order": 2, "color": "yellow"},
    {"name": "Qualified", "order": 3, "color": "purple"},
    {"name": "Proposal", "order": 4, "color": "orange"},
    {"name": "Negotiation", "order": 5, "color": "pink"},
    {"name": "Won", "order": 6, "color": "green"},
    {"name": "Lost", "order": 7, "color": "red"}
  ]'::jsonb,
  
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_leads
CREATE POLICY "Team members can view business leads"
ON crm_leads FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create leads"
ON crm_leads FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can update leads"
ON crm_leads FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can delete leads"
ON crm_leads FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for crm_activities
CREATE POLICY "Team members can view activities"
ON crm_activities FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create activities"
ON crm_activities FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can update activities"
ON crm_activities FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can delete activities"
ON crm_activities FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for crm_pipelines
CREATE POLICY "Team members can view pipelines"
ON crm_pipelines FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can manage pipelines"
ON crm_pipelines FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT btm.business_id FROM business_team_members btm
    WHERE btm.user_id = auth.uid() AND btm.role IN ('owner', 'admin')
  )
);

-- Indexes for performance
CREATE INDEX idx_crm_leads_business_id ON crm_leads(business_id);
CREATE INDEX idx_crm_leads_status ON crm_leads(status);
CREATE INDEX idx_crm_leads_assigned_to ON crm_leads(assigned_to);
CREATE INDEX idx_crm_leads_customer_id ON crm_leads(customer_id);
CREATE INDEX idx_crm_activities_lead_id ON crm_activities(lead_id);
CREATE INDEX idx_crm_activities_business_id ON crm_activities(business_id);
CREATE INDEX idx_crm_pipelines_business_id ON crm_pipelines(business_id);

-- Triggers for updated_at
CREATE TRIGGER update_crm_leads_updated_at
BEFORE UPDATE ON crm_leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_activities_updated_at
BEFORE UPDATE ON crm_activities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_pipelines_updated_at
BEFORE UPDATE ON crm_pipelines
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create default pipeline for new businesses
CREATE OR REPLACE FUNCTION create_default_crm_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO crm_pipelines (business_id, name, is_default)
  VALUES (NEW.id, 'Default Sales Pipeline', true);
  RETURN NEW;
END;
$$;

-- Trigger to create default pipeline when business is created
CREATE TRIGGER on_business_created_crm_pipeline
AFTER INSERT ON business_profiles
FOR EACH ROW
EXECUTE FUNCTION create_default_crm_pipeline();

-- Function to update last_contacted_at when activity is created
CREATE OR REPLACE FUNCTION update_lead_last_contacted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.activity_type IN ('call', 'meeting', 'email', 'message') AND NEW.completed_at IS NOT NULL THEN
    UPDATE crm_leads
    SET last_contacted_at = NEW.completed_at
    WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_activity_created_update_lead
AFTER INSERT OR UPDATE ON crm_activities
FOR EACH ROW
EXECUTE FUNCTION update_lead_last_contacted();