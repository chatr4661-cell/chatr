-- Caller reports from individual users
CREATE TABLE public.caller_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  caller_name TEXT,
  report_type VARCHAR(20) NOT NULL DEFAULT 'spam',
  spam_type VARCHAR(30),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reporter_id, phone_number),
  CONSTRAINT valid_report_type CHECK (report_type IN ('spam', 'scam', 'telemarketer', 'robocall', 'fraud', 'safe', 'business'))
);

ALTER TABLE public.caller_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own reports"
  ON public.caller_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view all reports for caller ID"
  ON public.caller_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete their own reports"
  ON public.caller_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Aggregated caller ID per phone number
CREATE TABLE public.caller_id_aggregates (
  phone_number TEXT PRIMARY KEY,
  community_name TEXT,
  total_reports INTEGER NOT NULL DEFAULT 0,
  spam_reports INTEGER NOT NULL DEFAULT 0,
  safe_reports INTEGER NOT NULL DEFAULT 0,
  spam_percentage REAL NOT NULL DEFAULT 0,
  most_common_type VARCHAR(30),
  community_label VARCHAR(50),
  first_reported_at TIMESTAMPTZ,
  last_reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.caller_id_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read caller ID aggregates"
  ON public.caller_id_aggregates FOR SELECT
  USING (true);

-- Auto-aggregate trigger
CREATE OR REPLACE FUNCTION public.update_caller_id_aggregate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone TEXT;
  v_total INTEGER;
  v_spam INTEGER;
  v_safe INTEGER;
  v_name TEXT;
  v_type VARCHAR(30);
  v_pct REAL;
  v_label VARCHAR(50);
  v_first TIMESTAMPTZ;
BEGIN
  v_phone := COALESCE(NEW.phone_number, OLD.phone_number);

  SELECT COUNT(*), 
         COUNT(*) FILTER (WHERE report_type IN ('spam','scam','telemarketer','robocall','fraud')),
         COUNT(*) FILTER (WHERE report_type = 'safe'),
         MIN(created_at)
  INTO v_total, v_spam, v_safe, v_first
  FROM caller_reports WHERE phone_number = v_phone;

  IF v_total = 0 THEN
    DELETE FROM caller_id_aggregates WHERE phone_number = v_phone;
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_pct := CASE WHEN v_total > 0 THEN (v_spam::REAL / v_total) * 100 ELSE 0 END;

  SELECT caller_name INTO v_name
  FROM caller_reports WHERE phone_number = v_phone AND caller_name IS NOT NULL
  GROUP BY caller_name ORDER BY COUNT(*) DESC LIMIT 1;

  SELECT report_type INTO v_type
  FROM caller_reports WHERE phone_number = v_phone
  GROUP BY report_type ORDER BY COUNT(*) DESC LIMIT 1;

  v_label := CASE
    WHEN v_pct >= 80 AND v_total >= 5 THEN 'Confirmed Spam'
    WHEN v_pct >= 60 THEN 'Likely Spam'
    WHEN v_pct >= 40 THEN 'Suspected Spam'
    WHEN v_type = 'safe' AND v_total >= 3 THEN 'Verified Safe'
    WHEN v_type = 'business' THEN 'Business'
    ELSE 'Unknown'
  END;

  INSERT INTO caller_id_aggregates (phone_number, community_name, total_reports, spam_reports, safe_reports, spam_percentage, most_common_type, community_label, first_reported_at, last_reported_at, updated_at)
  VALUES (v_phone, v_name, v_total, v_spam, v_safe, v_pct, v_type, v_label, v_first, now(), now())
  ON CONFLICT (phone_number) DO UPDATE SET
    community_name = EXCLUDED.community_name,
    total_reports = EXCLUDED.total_reports,
    spam_reports = EXCLUDED.spam_reports,
    safe_reports = EXCLUDED.safe_reports,
    spam_percentage = EXCLUDED.spam_percentage,
    most_common_type = EXCLUDED.most_common_type,
    community_label = EXCLUDED.community_label,
    first_reported_at = EXCLUDED.first_reported_at,
    last_reported_at = EXCLUDED.last_reported_at,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_caller_id
AFTER INSERT OR DELETE ON public.caller_reports
FOR EACH ROW EXECUTE FUNCTION public.update_caller_id_aggregate();

-- Fast lookup function
CREATE OR REPLACE FUNCTION public.lookup_caller_id(p_phone TEXT)
RETURNS TABLE(community_name TEXT, spam_percentage REAL, total_reports INTEGER, community_label VARCHAR, most_common_type VARCHAR)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT community_name, spam_percentage, total_reports, community_label, most_common_type
  FROM caller_id_aggregates
  WHERE phone_number = p_phone;
$$;

CREATE INDEX idx_caller_reports_phone ON public.caller_reports(phone_number);
CREATE INDEX idx_caller_reports_reporter ON public.caller_reports(reporter_id);