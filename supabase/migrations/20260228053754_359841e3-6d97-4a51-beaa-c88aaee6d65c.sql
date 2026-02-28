
-- ──────────────────────────────────────────────────────────
-- 1. Extend `calls` table with additional outcome + telemetry columns
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS outcome_tag        TEXT,
  ADD COLUMN IF NOT EXISTS outcome_note       TEXT,
  ADD COLUMN IF NOT EXISTS route_type         TEXT,
  ADD COLUMN IF NOT EXISTS caller_name        TEXT,
  ADD COLUMN IF NOT EXISTS caller_avatar      TEXT,
  ADD COLUMN IF NOT EXISTS receiver_name      TEXT,
  ADD COLUMN IF NOT EXISTS receiver_avatar    TEXT;

-- ──────────────────────────────────────────────────────────
-- 2. call_telemetry — per-call network intelligence sink
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.call_telemetry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id               TEXT NOT NULL,
  user_id               UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id            TEXT,
  network_start_state   JSONB NOT NULL DEFAULT '{}',
  route_chosen          TEXT NOT NULL DEFAULT 'UNKNOWN',
  route_switches        SMALLINT NOT NULL DEFAULT 0,
  retry_attempts        SMALLINT NOT NULL DEFAULT 0,
  codec_degradations    SMALLINT NOT NULL DEFAULT 0,
  peak_rtt_ms           INTEGER,
  peak_jitter_ms        INTEGER,
  call_duration_s       INTEGER,
  silence_ratio         REAL,
  outcome_tag           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_call_telemetry_user     ON public.call_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_call_telemetry_contact  ON public.call_telemetry(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_telemetry_route    ON public.call_telemetry(route_chosen);
CREATE INDEX IF NOT EXISTS idx_call_telemetry_outcome  ON public.call_telemetry(outcome_tag);

ALTER TABLE public.call_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their telemetry"
  ON public.call_telemetry
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────
-- 3. Upgrade contact_intelligence with richer fields
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.contact_intelligence
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS total_calls INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS answered_calls INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolved_calls INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missed_calls INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voicemail_calls INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolution_rate REAL NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS drop_rate REAL NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS best_hour_utc SMALLINT,
  ADD COLUMN IF NOT EXISTS avg_voip_score REAL,
  ADD COLUMN IF NOT EXISTS avg_gsm_score REAL,
  ADD COLUMN IF NOT EXISTS avg_clarity_score REAL,
  ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_outcome TEXT;

-- Update pickup_likelihood type if needed (already exists as NUMERIC, add default)
ALTER TABLE public.contact_intelligence
  ALTER COLUMN pickup_likelihood SET DEFAULT 0.5;

CREATE INDEX IF NOT EXISTS idx_contact_intel_pickup ON public.contact_intelligence(pickup_likelihood DESC);

-- ──────────────────────────────────────────────────────────
-- 4. Function: refresh contact intelligence from telemetry
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_contact_intelligence(
  p_user_id    UUID,
  p_contact_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total        INTEGER;
  v_answered     INTEGER;
  v_resolved     INTEGER;
  v_missed       INTEGER;
  v_voicemail    INTEGER;
  v_pickup       REAL;
  v_resolution   REAL;
  v_best_hour    SMALLINT;
  v_pref_route   TEXT;
  v_avg_voip     REAL;
  v_avg_gsm      REAL;
  v_avg_clarity  REAL;
  v_last_call    TIMESTAMPTZ;
  v_last_outcome TEXT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE c.status = 'completed'),
    COUNT(*) FILTER (WHERE ct.outcome_tag = 'resolved'),
    COUNT(*) FILTER (WHERE c.status IN ('missed', 'no_answer')),
    COUNT(*) FILTER (WHERE ct.outcome_tag = 'voicemail')
  INTO v_total, v_answered, v_resolved, v_missed, v_voicemail
  FROM public.calls c
  LEFT JOIN public.call_telemetry ct ON ct.call_id = c.id::TEXT
  WHERE c.caller_id::TEXT = p_user_id::TEXT
    AND c.receiver_id::TEXT = p_contact_id;

  v_pickup     := CASE WHEN v_total > 0 THEN v_answered::REAL / v_total ELSE 0.5 END;
  v_resolution := CASE WHEN v_answered > 0 THEN v_resolved::REAL / v_answered ELSE 0.5 END;

  SELECT EXTRACT(HOUR FROM c.started_at)::SMALLINT
  INTO v_best_hour
  FROM public.calls c
  WHERE c.caller_id::TEXT = p_user_id::TEXT
    AND c.receiver_id::TEXT = p_contact_id
    AND c.status = 'completed'
  GROUP BY EXTRACT(HOUR FROM c.started_at)
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT ct.route_chosen
  INTO v_pref_route
  FROM public.call_telemetry ct
  WHERE ct.user_id = p_user_id AND ct.contact_id = p_contact_id
  GROUP BY ct.route_chosen
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT
    AVG((ct.network_start_state->>'voipScore')::REAL),
    AVG((ct.network_start_state->>'gsmScore')::REAL),
    AVG(c.clarity_score)
  INTO v_avg_voip, v_avg_gsm, v_avg_clarity
  FROM public.call_telemetry ct
  JOIN public.calls c ON c.id::TEXT = ct.call_id
  WHERE ct.user_id = p_user_id AND ct.contact_id = p_contact_id;

  SELECT c.started_at, ct.outcome_tag
  INTO v_last_call, v_last_outcome
  FROM public.calls c
  LEFT JOIN public.call_telemetry ct ON ct.call_id = c.id::TEXT
  WHERE c.caller_id::TEXT = p_user_id::TEXT AND c.receiver_id::TEXT = p_contact_id
  ORDER BY c.started_at DESC NULLS LAST
  LIMIT 1;

  INSERT INTO public.contact_intelligence (
    user_id, contact_id,
    total_calls, answered_calls, resolved_calls, missed_calls, voicemail_calls,
    pickup_likelihood, resolution_rate,
    best_hour_utc,
    optimal_call_window_start, optimal_call_window_end,
    preferred_route,
    avg_voip_score, avg_gsm_score, avg_clarity_score,
    last_call_at, last_outcome,
    last_updated
  ) VALUES (
    p_user_id, p_contact_id,
    COALESCE(v_total, 0), COALESCE(v_answered, 0), COALESCE(v_resolved, 0),
    COALESCE(v_missed, 0), COALESCE(v_voicemail, 0),
    COALESCE(v_pickup, 0.5), COALESCE(v_resolution, 0.5),
    v_best_hour,
    CASE WHEN v_best_hour IS NOT NULL THEN make_time(v_best_hour, 0, 0) ELSE NULL END,
    CASE WHEN v_best_hour IS NOT NULL THEN make_time(LEAST(v_best_hour + 2, 23), 0, 0) ELSE NULL END,
    COALESCE(v_pref_route, 'GSM'),
    v_avg_voip, v_avg_gsm, v_avg_clarity,
    v_last_call, v_last_outcome,
    NOW()
  )
  ON CONFLICT (user_id, contact_id) DO UPDATE SET
    total_calls           = EXCLUDED.total_calls,
    answered_calls        = EXCLUDED.answered_calls,
    resolved_calls        = EXCLUDED.resolved_calls,
    missed_calls          = EXCLUDED.missed_calls,
    voicemail_calls       = EXCLUDED.voicemail_calls,
    pickup_likelihood     = EXCLUDED.pickup_likelihood,
    resolution_rate       = EXCLUDED.resolution_rate,
    best_hour_utc         = EXCLUDED.best_hour_utc,
    optimal_call_window_start = EXCLUDED.optimal_call_window_start,
    optimal_call_window_end   = EXCLUDED.optimal_call_window_end,
    preferred_route       = EXCLUDED.preferred_route,
    avg_voip_score        = EXCLUDED.avg_voip_score,
    avg_gsm_score         = EXCLUDED.avg_gsm_score,
    avg_clarity_score     = EXCLUDED.avg_clarity_score,
    last_call_at          = EXCLUDED.last_call_at,
    last_outcome          = EXCLUDED.last_outcome,
    last_updated          = NOW();
END;
$$;

-- ──────────────────────────────────────────────────────────
-- 5. Trigger: auto-refresh contact intelligence on telemetry close
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_telemetry_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.closed_at IS NOT NULL AND OLD.closed_at IS NULL THEN
    PERFORM public.refresh_contact_intelligence(NEW.user_id, NEW.contact_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_telemetry_closed ON public.call_telemetry;
CREATE TRIGGER trg_telemetry_closed
  AFTER UPDATE OF closed_at ON public.call_telemetry
  FOR EACH ROW EXECUTE FUNCTION public.trg_telemetry_closed();

-- ──────────────────────────────────────────────────────────
-- 6. Resolved Call Percentage (RCP) — user-level view
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.user_call_rcp AS
SELECT
  c.caller_id AS user_id,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE c.outcome_tag = 'resolved') AS resolved_calls,
  ROUND(
    CASE
      WHEN COUNT(*) FILTER (WHERE c.outcome_tag IS NOT NULL) > 0
      THEN COUNT(*) FILTER (WHERE c.outcome_tag = 'resolved')::NUMERIC
           / COUNT(*) FILTER (WHERE c.outcome_tag IS NOT NULL) * 100
      ELSE 0
    END, 1
  ) AS resolved_percentage,
  COUNT(*) FILTER (
    WHERE c.created_at >= NOW() - INTERVAL '7 days'
    AND c.outcome_tag = 'resolved'
  ) AS resolved_last_7d,
  COUNT(*) FILTER (
    WHERE c.created_at >= NOW() - INTERVAL '7 days'
  ) AS total_last_7d
FROM public.calls c
WHERE c.outcome_tag IS NOT NULL
GROUP BY c.caller_id;
