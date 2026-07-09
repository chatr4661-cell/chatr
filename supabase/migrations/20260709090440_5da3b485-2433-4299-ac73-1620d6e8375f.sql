-- Migration: Phase 3 — Universal Execution Queue
-- Date: 2026-07-09

-- 1. Rename existing email_queue to execution_queue (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_queue') THEN
        ALTER TABLE public.email_queue RENAME TO execution_queue;
    END IF;
END $$;

-- 2. Create the execution_queue table if it didn't exist at all
CREATE TABLE IF NOT EXISTS public.execution_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid,
  workflow_id text,
  execution_id text,
  capability text NOT NULL,
  provider text,
  priority integer DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  scheduled_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  error jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  worker_id text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- If we renamed the table, we need to add the new columns that weren't in email_queue
DO $$
BEGIN
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS tenant_id uuid;
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS workflow_id text;
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS execution_id text;
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS capability text DEFAULT 'unknown';
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS provider text;
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT now();
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS started_at timestamptz;
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS completed_at timestamptz;
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS error jsonb;
    ALTER TABLE public.execution_queue ADD COLUMN IF NOT EXISTS worker_id text;

    ALTER TABLE public.execution_queue DROP CONSTRAINT IF EXISTS email_queue_status_check;
    ALTER TABLE public.execution_queue DROP COLUMN IF EXISTS to_address;
    ALTER TABLE public.execution_queue DROP COLUMN IF EXISTS from_address;
    ALTER TABLE public.execution_queue DROP COLUMN IF EXISTS subject;
    ALTER TABLE public.execution_queue DROP COLUMN IF EXISTS body;
    ALTER TABLE public.execution_queue DROP COLUMN IF EXISTS html_body;
    ALTER TABLE public.execution_queue DROP COLUMN IF EXISTS send_at;
    ALTER TABLE public.execution_queue DROP COLUMN IF EXISTS sent_at;
    ALTER TABLE public.execution_queue DROP COLUMN IF EXISTS error_message;
    ALTER TABLE public.execution_queue DROP COLUMN IF EXISTS workflow_run_id;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Grants (required for PostgREST Data API access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execution_queue TO authenticated;
GRANT ALL ON public.execution_queue TO service_role;

-- Secure the table
ALTER TABLE public.execution_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own queued emails" ON public.execution_queue;
DROP POLICY IF EXISTS "Users can insert emails" ON public.execution_queue;
DROP POLICY IF EXISTS "Users can view their own queued executions" ON public.execution_queue;
DROP POLICY IF EXISTS "Users can insert executions" ON public.execution_queue;

CREATE POLICY "Users can view their own queued executions"
  ON public.execution_queue FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert executions"
  ON public.execution_queue FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own executions"
  ON public.execution_queue FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Indexes for performance and polling
CREATE INDEX IF NOT EXISTS idx_execution_queue_status_scheduled ON public.execution_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_execution_queue_capability ON public.execution_queue(capability);
CREATE INDEX IF NOT EXISTS idx_execution_queue_created_by ON public.execution_queue(created_by);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_execution_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_execution_queue_updated_at ON public.execution_queue;
CREATE TRIGGER trigger_update_execution_queue_updated_at
BEFORE UPDATE ON public.execution_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_execution_queue_updated_at();