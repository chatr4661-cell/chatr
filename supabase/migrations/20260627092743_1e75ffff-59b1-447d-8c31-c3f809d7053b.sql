CREATE TABLE IF NOT EXISTS public.automation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text,
    trigger_type text NOT NULL,
    action_type text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    conditions jsonb DEFAULT '{}',
    actions jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own automation rules"
ON public.automation_rules FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.automation_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rule_id uuid NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    trigger_type text NOT NULL,
    action_taken text NOT NULL,
    time_saved_seconds integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_logs TO authenticated;
GRANT ALL ON public.automation_logs TO service_role;

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own automation logs"
ON public.automation_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automation logs"
ON public.automation_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_automation_logs_user_id ON public.automation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_id ON public.automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.automation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_automation_rules_user_id ON public.automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_is_active ON public.automation_rules(is_active);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON public.automation_rules;
CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_logs_updated_at ON public.automation_logs;
CREATE TRIGGER update_automation_logs_updated_at
BEFORE UPDATE ON public.automation_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_automation_metrics(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_active_count integer;
    v_runs_today integer;
    v_time_saved_seconds integer;
BEGIN
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT count(*) INTO v_active_count
    FROM public.automation_rules
    WHERE user_id = p_user_id AND is_active = true;

    SELECT count(*) INTO v_runs_today
    FROM public.automation_logs
    WHERE user_id = p_user_id AND created_at >= now() - interval '24 hours';

    SELECT COALESCE(sum(time_saved_seconds), 0) INTO v_time_saved_seconds
    FROM public.automation_logs
    WHERE user_id = p_user_id;

    RETURN json_build_object(
        'activeCount', v_active_count,
        'runsToday', v_runs_today,
        'timeSavedSeconds', v_time_saved_seconds
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_automation_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_automation_metrics(uuid) TO service_role;