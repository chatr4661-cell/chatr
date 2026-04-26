-- Admin-only function to read cron job health (cron schema requires elevated access)
CREATE OR REPLACE FUNCTION public.get_cron_jobs_health(name_filter text DEFAULT '%digest%')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only admins/ceos can call
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ceo'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_jsonb(t)), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      j.jobid,
      j.jobname,
      j.schedule,
      j.active,
      (
        SELECT row_to_jsonb(lr)
        FROM (
          SELECT r.runid, r.status, r.return_message, r.start_time, r.end_time,
                 EXTRACT(EPOCH FROM (r.end_time - r.start_time)) * 1000 AS duration_ms
          FROM cron.job_run_details r
          WHERE r.jobid = j.jobid
          ORDER BY r.start_time DESC NULLS LAST
          LIMIT 1
        ) lr
      ) AS last_run,
      (
        SELECT COALESCE(jsonb_agg(row_to_jsonb(rr) ORDER BY rr.start_time DESC), '[]'::jsonb)
        FROM (
          SELECT r.runid, r.status, r.return_message, r.start_time, r.end_time,
                 EXTRACT(EPOCH FROM (r.end_time - r.start_time)) * 1000 AS duration_ms
          FROM cron.job_run_details r
          WHERE r.jobid = j.jobid
          ORDER BY r.start_time DESC NULLS LAST
          LIMIT 20
        ) rr
      ) AS recent_runs,
      (
        SELECT COUNT(*)::int FROM cron.job_run_details r
        WHERE r.jobid = j.jobid AND r.status = 'failed'
          AND r.start_time > now() - interval '24 hours'
      ) AS failures_24h,
      (
        SELECT COUNT(*)::int FROM cron.job_run_details r
        WHERE r.jobid = j.jobid AND r.start_time > now() - interval '24 hours'
      ) AS runs_24h,
      (
        SELECT COUNT(*)::int FROM cron.job_run_details r
        WHERE r.jobid = j.jobid AND r.status = 'running'
      ) AS currently_running
    FROM cron.job j
    WHERE j.jobname ILIKE name_filter
  ) t;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_jobs_health(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cron_jobs_health(text) TO authenticated;