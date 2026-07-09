-- ============================================================
-- Phase 4 — Enterprise Workflow Governance
-- Date: 2026-07-09
-- ============================================================

-- ------------------------------------------------------------
-- 4.1  Workflow versioning
-- ------------------------------------------------------------
ALTER TABLE public.business_workflows
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_version_id uuid;

CREATE TABLE IF NOT EXISTS public.workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.business_workflows(id) ON DELETE CASCADE,
  version integer NOT NULL,
  name text NOT NULL,
  description text,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version)
);

CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON public.workflow_versions(workflow_id);

GRANT SELECT, INSERT ON public.workflow_versions TO authenticated;
GRANT ALL ON public.workflow_versions TO service_role;

ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;

-- Immutable: only SELECT + INSERT policies (no UPDATE/DELETE => blocked by RLS)
CREATE POLICY "Owners can view workflow versions"
  ON public.workflow_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.business_workflows w
    WHERE w.id = workflow_versions.workflow_id AND w.profile_id = auth.uid()
  ));

CREATE POLICY "Owners can create workflow versions"
  ON public.workflow_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.business_workflows w
    WHERE w.id = workflow_versions.workflow_id AND w.profile_id = auth.uid()
  ));

-- ------------------------------------------------------------
-- 4.2  Workflow runs + append-only audit logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.business_workflows(id) ON DELETE CASCADE,
  version integer,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  trigger_type text,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_runs_status_check CHECK (status = ANY (ARRAY['pending','running','completed','failed','cancelled']))
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON public.workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_correlation_id ON public.workflow_runs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON public.workflow_runs(status);

GRANT SELECT, INSERT, UPDATE ON public.workflow_runs TO authenticated;
GRANT ALL ON public.workflow_runs TO service_role;

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view workflow runs"
  ON public.workflow_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.business_workflows w
    WHERE w.id = workflow_runs.workflow_id AND w.profile_id = auth.uid()
  ));

CREATE POLICY "Owners can create workflow runs"
  ON public.workflow_runs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.business_workflows w
    WHERE w.id = workflow_runs.workflow_id AND w.profile_id = auth.uid()
  ));

CREATE POLICY "Owners can update workflow runs"
  ON public.workflow_runs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.business_workflows w
    WHERE w.id = workflow_runs.workflow_id AND w.profile_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_workflow_runs_updated_at ON public.workflow_runs;
CREATE TRIGGER trigger_update_workflow_runs_updated_at
  BEFORE UPDATE ON public.workflow_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Append-only audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  correlation_id uuid,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON public.audit_logs(correlation_id);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (actor_id = auth.uid());

-- DB-level no-update / no-delete enforcement (blocks even service_role)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_prevent_audit_log_mutation ON public.audit_logs;
CREATE TRIGGER trigger_prevent_audit_log_mutation
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- ------------------------------------------------------------
-- 4.3  Approvals (HITL) + secrets vault
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES public.business_workflows(id) ON DELETE CASCADE,
  step_index integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_approvals_status_check CHECK (status = ANY (ARRAY['pending','approved','rejected','cancelled']))
);

CREATE INDEX IF NOT EXISTS idx_workflow_approvals_run_id ON public.workflow_approvals(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_status ON public.workflow_approvals(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_approvals TO authenticated;
GRANT ALL ON public.workflow_approvals TO service_role;

ALTER TABLE public.workflow_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Involved users can view approvals"
  ON public.workflow_approvals FOR SELECT
  USING (requested_by = auth.uid() OR approver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Requesters can create approvals"
  ON public.workflow_approvals FOR INSERT
  WITH CHECK (requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approvers and admins can update approvals"
  ON public.workflow_approvals FOR UPDATE
  USING (approver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete approvals"
  ON public.workflow_approvals FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trigger_update_workflow_approvals_updated_at ON public.workflow_approvals;
CREATE TRIGGER trigger_update_workflow_approvals_updated_at
  BEFORE UPDATE ON public.workflow_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Secrets vault (stores only a reference, never the secret value)
CREATE TABLE IF NOT EXISTS public.secrets_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL UNIQUE,
  vault_ref text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.secrets_vault TO authenticated;
GRANT ALL ON public.secrets_vault TO service_role;

ALTER TABLE public.secrets_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage secrets vault"
  ON public.secrets_vault FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trigger_update_secrets_vault_updated_at ON public.secrets_vault;
CREATE TRIGGER trigger_update_secrets_vault_updated_at
  BEFORE UPDATE ON public.secrets_vault
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();