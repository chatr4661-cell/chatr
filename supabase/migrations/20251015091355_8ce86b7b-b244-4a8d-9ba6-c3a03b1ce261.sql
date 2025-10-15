-- Create business broadcasts table
CREATE TABLE IF NOT EXISTS public.business_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience JSONB DEFAULT '{"type": "all"}'::jsonb,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  recipient_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create business products/services table
CREATE TABLE IF NOT EXISTS public.business_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC,
  currency TEXT DEFAULT 'INR',
  images JSONB DEFAULT '[]'::jsonb,
  is_service BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  stock_quantity INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies for broadcasts
CREATE POLICY "Business team can manage broadcasts"
  ON public.business_broadcasts
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view sent broadcasts"
  ON public.business_broadcasts
  FOR SELECT
  USING (status = 'sent');

-- RLS Policies for catalog
CREATE POLICY "Business team can manage catalog"
  ON public.business_catalog
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active catalog items"
  ON public.business_catalog
  FOR SELECT
  USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_business_broadcasts_updated_at
  BEFORE UPDATE ON public.business_broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chatr_updated_at();

CREATE TRIGGER update_business_catalog_updated_at
  BEFORE UPDATE ON public.business_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chatr_updated_at();