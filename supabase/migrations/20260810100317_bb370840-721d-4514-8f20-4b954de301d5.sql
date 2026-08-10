-- 1. Visitor acquisition attribution (real observed signals only)
CREATE TABLE public.seo_attribution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  host TEXT NOT NULL,
  landing_path TEXT NOT NULL,
  first_touch JSONB,
  last_touch JSONB,
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  search_query TEXT,
  has_external_signal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_attribution_created ON public.seo_attribution (created_at DESC);
CREATE INDEX idx_seo_attribution_landing ON public.seo_attribution (landing_path);
GRANT INSERT ON public.seo_attribution TO anon;
GRANT SELECT, INSERT ON public.seo_attribution TO authenticated;
GRANT ALL ON public.seo_attribution TO service_role;
ALTER TABLE public.seo_attribution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record their own arrival"
  ON public.seo_attribution FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read attribution"
  ON public.seo_attribution FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'));

-- 2. Indexable page inventory
CREATE TABLE public.seo_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL,
  path TEXT NOT NULL,
  cluster TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'pages',
  primary_intent TEXT,
  title TEXT,
  description TEXT,
  is_indexable BOOLEAN NOT NULL DEFAULT true,
  content_last_modified DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (domain, path)
);
GRANT SELECT ON public.seo_pages TO anon;
GRANT SELECT ON public.seo_pages TO authenticated;
GRANT ALL ON public.seo_pages TO service_role;
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Page inventory is public" ON public.seo_pages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage page inventory" ON public.seo_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Opportunities (evidence-backed, never invented)
CREATE TABLE public.seo_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL,
  cluster TEXT,
  target_path TEXT,
  intent TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'create',
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_opportunities_status ON public.seo_opportunities (status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_opportunities TO authenticated;
GRANT ALL ON public.seo_opportunities TO service_role;
ALTER TABLE public.seo_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage opportunities" ON public.seo_opportunities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Search Console sync log
CREATE TABLE public.seo_gsc_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_url TEXT,
  range_start DATE,
  range_end DATE,
  status TEXT NOT NULL,
  rows_stored INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_seo_gsc_sync_started ON public.seo_gsc_sync (started_at DESC);
GRANT SELECT ON public.seo_gsc_sync TO authenticated;
GRANT ALL ON public.seo_gsc_sync TO service_role;
ALTER TABLE public.seo_gsc_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read gsc sync log" ON public.seo_gsc_sync FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'));

-- 5. Search Console metrics, stored verbatim and idempotently
CREATE TABLE public.seo_search_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_url TEXT NOT NULL,
  metric_date DATE NOT NULL,
  page TEXT NOT NULL DEFAULT '',
  query TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT '',
  clicks NUMERIC NOT NULL DEFAULT 0,
  impressions NUMERIC NOT NULL DEFAULT 0,
  ctr NUMERIC NOT NULL DEFAULT 0,
  position NUMERIC NOT NULL DEFAULT 0,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (site_url, metric_date, page, query, country, device)
);
CREATE INDEX idx_seo_search_metrics_date ON public.seo_search_metrics (metric_date DESC);
CREATE INDEX idx_seo_search_metrics_page ON public.seo_search_metrics (page);
GRANT SELECT ON public.seo_search_metrics TO authenticated;
GRANT ALL ON public.seo_search_metrics TO service_role;
ALTER TABLE public.seo_search_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read search metrics" ON public.seo_search_metrics FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'));

CREATE TRIGGER trg_seo_pages_updated BEFORE UPDATE ON public.seo_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_seo_opportunities_updated BEFORE UPDATE ON public.seo_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();