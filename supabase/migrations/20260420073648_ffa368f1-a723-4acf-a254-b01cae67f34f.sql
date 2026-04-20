
-- Plans
CREATE TABLE IF NOT EXISTS public.cc_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  department TEXT NOT NULL CHECK (department IN ('engineering','sales','marketing','operations','finance','ceo')),
  impact_level TEXT NOT NULL DEFAULT 'low' CHECK (impact_level IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executing','completed','cancelled')),
  generated_by TEXT NOT NULL DEFAULT 'ai_ceo',
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by UUID
);

CREATE TABLE IF NOT EXISTS public.cc_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.cc_plans(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','blocked')),
  assigned_agent TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cc_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.cc_plans(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected','edited')),
  notes TEXT,
  decided_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cc_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  revenue NUMERIC DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cc_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  action TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info','warn','error','success')),
  details JSONB DEFAULT '{}'::jsonb,
  plan_id UUID REFERENCES public.cc_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cc_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO view plans" ON public.cc_plans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO update plans" ON public.cc_plans FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO insert plans" ON public.cc_plans FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO delete plans" ON public.cc_plans FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ceo'));

CREATE POLICY "CEO view tasks" ON public.cc_tasks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO write tasks" ON public.cc_tasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO update tasks" ON public.cc_tasks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO delete tasks" ON public.cc_tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ceo'));

CREATE POLICY "CEO view approvals" ON public.cc_approvals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO insert approvals" ON public.cc_approvals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ceo') AND decided_by = auth.uid());

CREATE POLICY "CEO view metrics" ON public.cc_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO insert metrics" ON public.cc_metrics FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ceo'));

CREATE POLICY "CEO view logs" ON public.cc_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO insert logs" ON public.cc_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ceo'));

CREATE TRIGGER cc_plans_updated_at BEFORE UPDATE ON public.cc_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER cc_tasks_updated_at BEFORE UPDATE ON public.cc_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.grant_ceo_role_to_founder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL AND regexp_replace(NEW.phone_number, '[^0-9]', '', 'g') IN ('919717845477','9717845477') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'ceo'::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_ceo_on_profile_change ON public.profiles;
CREATE TRIGGER grant_ceo_on_profile_change
AFTER INSERT OR UPDATE OF phone_number ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_ceo_role_to_founder();

DO $$
DECLARE founder_id UUID;
BEGIN
  SELECT id INTO founder_id FROM public.profiles
  WHERE regexp_replace(COALESCE(phone_number,''), '[^0-9]', '', 'g') IN ('919717845477','9717845477')
  LIMIT 1;
  IF founder_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (founder_id, 'ceo'::public.app_role) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (founder_id, 'admin'::public.app_role) ON CONFLICT DO NOTHING;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.cc_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cc_plans;
