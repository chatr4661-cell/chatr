import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRows } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const isAdmin = (roleRows ?? []).some((r: any) => ['admin', 'ceo'].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use raw SQL via a one-off RPC: query cron.job and cron.job_run_details
    const sql = `
      SELECT
        j.jobid,
        j.jobname,
        j.schedule,
        j.active,
        (
          SELECT json_build_object(
            'runid', r.runid,
            'status', r.status,
            'return_message', r.return_message,
            'start_time', r.start_time,
            'end_time', r.end_time,
            'duration_ms', EXTRACT(EPOCH FROM (r.end_time - r.start_time)) * 1000
          )
          FROM cron.job_run_details r
          WHERE r.jobid = j.jobid
          ORDER BY r.start_time DESC NULLS LAST
          LIMIT 1
        ) AS last_run,
        (
          SELECT json_agg(x ORDER BY x.start_time DESC)
          FROM (
            SELECT r.runid, r.status, r.return_message, r.start_time, r.end_time,
                   EXTRACT(EPOCH FROM (r.end_time - r.start_time)) * 1000 AS duration_ms
            FROM cron.job_run_details r
            WHERE r.jobid = j.jobid
            ORDER BY r.start_time DESC NULLS LAST
            LIMIT 20
          ) x
        ) AS recent_runs,
        (
          SELECT COUNT(*) FILTER (WHERE r.status = 'failed')
          FROM cron.job_run_details r
          WHERE r.jobid = j.jobid
            AND r.start_time > now() - interval '24 hours'
        ) AS failures_24h,
        (
          SELECT COUNT(*)
          FROM cron.job_run_details r
          WHERE r.jobid = j.jobid
            AND r.start_time > now() - interval '24 hours'
        ) AS runs_24h
      FROM cron.job j
      WHERE j.jobname ILIKE '%digest%'
         OR j.jobname ILIKE '%send-digest%'
         OR j.jobname ILIKE '%notification%';
    `;

    const { data, error } = await admin.rpc('exec_admin_sql', { sql_text: sql });

    if (error) {
      // Fallback: try direct query if RPC unavailable
      return new Response(JSON.stringify({
        error: 'cron_query_failed',
        message: error.message,
        hint: 'Create exec_admin_sql function or grant cron schema access',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ jobs: data ?? [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
