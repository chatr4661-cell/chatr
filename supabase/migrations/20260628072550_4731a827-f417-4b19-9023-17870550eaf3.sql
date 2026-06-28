CREATE TABLE IF NOT EXISTS public.workspace_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL,
  state TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  estimated_time_seconds INTEGER DEFAULT 60,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_tasks TO authenticated;
GRANT ALL ON public.workspace_tasks TO service_role;

ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their workspaces" ON public.workspace_tasks
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_members.workspace_id = workspace_tasks.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "Users can update tasks in their workspaces" ON public.workspace_tasks
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_members.workspace_id = workspace_tasks.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "Users can insert tasks in their workspaces" ON public.workspace_tasks
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_members.workspace_id = workspace_tasks.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE TRIGGER update_workspace_tasks_updated_at
BEFORE UPDATE ON public.workspace_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_chatr_updated_at();