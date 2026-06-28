-- ============================================================
-- Unified Workspace System
-- ============================================================

-- Core workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.workspace_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tags JSONB DEFAULT '[]'::jsonb,
  segment TEXT DEFAULT 'lead',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workspace_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.workspace_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  target_segment TEXT,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.workspace_customers(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_customers_ws ON public.workspace_customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_broadcasts_ws ON public.workspace_broadcasts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_templates_ws ON public.workspace_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activities_ws ON public.workspace_activities(workspace_id);

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_customers TO authenticated;
GRANT ALL ON public.workspace_customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_broadcasts TO authenticated;
GRANT ALL ON public.workspace_broadcasts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_templates TO authenticated;
GRANT ALL ON public.workspace_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_activities TO authenticated;
GRANT ALL ON public.workspace_activities TO service_role;

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_activities ENABLE ROW LEVEL SECURITY;

-- Recursion-safe helper functions
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id AND w.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = _workspace_id AND m.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id AND w.owner_id = _user_id
  )
$$;

-- ===== workspaces policies =====
CREATE POLICY "Members can view their workspaces" ON public.workspaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "Users can create their own workspaces" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update their workspaces" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can delete their workspaces" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ===== workspace_members policies =====
CREATE POLICY "Members can view membership" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_owner(workspace_id, auth.uid()));
CREATE POLICY "Owners can add members" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()));
CREATE POLICY "Owners can update members" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.is_workspace_owner(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()));
CREATE POLICY "Owners can remove members" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (public.is_workspace_owner(workspace_id, auth.uid()) OR user_id = auth.uid());

-- ===== workspace_customers policies =====
CREATE POLICY "Members can view customers" ON public.workspace_customers
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can manage customers" ON public.workspace_customers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can update customers" ON public.workspace_customers
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can delete customers" ON public.workspace_customers
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- ===== workspace_broadcasts policies =====
CREATE POLICY "Members can view broadcasts" ON public.workspace_broadcasts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can create broadcasts" ON public.workspace_broadcasts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can update broadcasts" ON public.workspace_broadcasts
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can delete broadcasts" ON public.workspace_broadcasts
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- ===== workspace_templates policies =====
CREATE POLICY "Members can view templates" ON public.workspace_templates
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can create templates" ON public.workspace_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can update templates" ON public.workspace_templates
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can delete templates" ON public.workspace_templates
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- ===== workspace_activities policies =====
CREATE POLICY "Members can view activities" ON public.workspace_activities
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members can create activities" ON public.workspace_activities
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_chatr_updated_at();
CREATE TRIGGER update_workspace_customers_updated_at BEFORE UPDATE ON public.workspace_customers FOR EACH ROW EXECUTE FUNCTION public.update_chatr_updated_at();
CREATE TRIGGER update_workspace_broadcasts_updated_at BEFORE UPDATE ON public.workspace_broadcasts FOR EACH ROW EXECUTE FUNCTION public.update_chatr_updated_at();
CREATE TRIGGER update_workspace_templates_updated_at BEFORE UPDATE ON public.workspace_templates FOR EACH ROW EXECUTE FUNCTION public.update_chatr_updated_at();