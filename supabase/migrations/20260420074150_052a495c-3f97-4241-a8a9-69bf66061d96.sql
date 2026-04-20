-- Sales Leads
CREATE TABLE public.cc_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.cc_plans(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  company TEXT,
  role_title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  location TEXT,
  industry TEXT,
  icp_match_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  source TEXT DEFAULT 'ai_generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cc_leads_status ON public.cc_leads(status);
CREATE INDEX idx_cc_leads_plan ON public.cc_leads(plan_id);

ALTER TABLE public.cc_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO and admins manage leads" ON public.cc_leads
  FOR ALL USING (
    public.has_role(auth.uid(), 'ceo'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE TRIGGER cc_leads_updated_at
  BEFORE UPDATE ON public.cc_leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Outreach Messages
CREATE TABLE public.cc_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.cc_leads(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.cc_plans(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'linkedin',
  subject TEXT,
  message_body TEXT NOT NULL,
  sequence_step INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cc_outreach_lead ON public.cc_outreach(lead_id);
CREATE INDEX idx_cc_outreach_status ON public.cc_outreach(status);

ALTER TABLE public.cc_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO and admins manage outreach" ON public.cc_outreach
  FOR ALL USING (
    public.has_role(auth.uid(), 'ceo'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE TRIGGER cc_outreach_updated_at
  BEFORE UPDATE ON public.cc_outreach
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Engineering Dev Tasks
CREATE TABLE public.cc_dev_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.cc_plans(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'feature',
  feature_spec TEXT,
  api_plan TEXT,
  lovable_prompt TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  estimated_hours NUMERIC(5,2),
  assigned_to TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cc_dev_tasks_status ON public.cc_dev_tasks(status);
CREATE INDEX idx_cc_dev_tasks_plan ON public.cc_dev_tasks(plan_id);

ALTER TABLE public.cc_dev_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO and admins manage dev tasks" ON public.cc_dev_tasks
  FOR ALL USING (
    public.has_role(auth.uid(), 'ceo'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE TRIGGER cc_dev_tasks_updated_at
  BEFORE UPDATE ON public.cc_dev_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Revenue Pipeline Daily Metrics
CREATE TABLE public.cc_revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leads_generated INTEGER DEFAULT 0,
  outreach_sent INTEGER DEFAULT 0,
  conversations_started INTEGER DEFAULT 0,
  deals_qualified INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  revenue_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(metric_date)
);

ALTER TABLE public.cc_revenue_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO and admins read revenue" ON public.cc_revenue_metrics
  FOR SELECT USING (
    public.has_role(auth.uid(), 'ceo'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "CEO and admins write revenue" ON public.cc_revenue_metrics
  FOR ALL USING (
    public.has_role(auth.uid(), 'ceo'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );