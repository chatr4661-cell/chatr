
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_url TEXT,
  trigger_when TEXT NOT NULL,
  rationale TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active templates"
ON public.notification_templates FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins manage templates"
ON public.notification_templates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_templates;
ALTER TABLE public.notification_templates REPLICA IDENTITY FULL;

INSERT INTO public.notification_templates (slug, category, type, title, body, metadata, action_url, trigger_when, rationale, sort_order) VALUES
('missed-call-1','missed','call','Missed call','Priya called you','{"caller_id":"demo-user-priya","count":"1"}'::jsonb,NULL,'Within 60 min of a missed call','Single missed call from one contact.',10),
('missed-call-many','missed','call','3 missed calls','Rahul tried to reach you 3 times','{"caller_id":"demo-user-rahul","count":"3"}'::jsonb,NULL,'When the same caller rang you ≥2 times in the last hour','Grouped — one push per caller, not per call.',20),
('missed-msg','missed','message','Unread from Asha','4 new messages waiting','{"sender_id":"demo-user-asha","count":"4"}'::jsonb,NULL,'Unread messages older than 30 min','Hourly bucket prevents repeat pings for the same thread.',30),
('wellness-morning','lifestyle','wellness','Hydrate first','Start with a glass of water — your brain wakes up faster.','{"slot":"morning"}'::jsonb,NULL,'10:00 AM IST','AI-crafted morning nudge (Lovable AI · gemini-2.5-flash-lite).',40),
('wellness-afternoon','lifestyle','wellness','Step away','You haven''t walked in a while. A 3-min walk resets focus.','{"slot":"afternoon"}'::jsonb,NULL,'3:00 PM IST','Movement nudge — AI varies wording each day.',50),
('wellness-night','lifestyle','wellness','Phone away soon','Try setting it across the room for tomorrow''s energy.','{"slot":"night"}'::jsonb,NULL,'9:00 PM IST','Evening wind-down nudge.',60),
('earn-fresh','earning','earning','7 fresh missions','New tasks just dropped. Tap to start earning Chatr Points.','{"count":"7"}'::jsonb,NULL,'11:00 AM and 6:00 PM IST','Only fires if active micro-tasks were created in last 24 h.',70),
('earn-mission','earning','earning','Voice review · ₹50','Record a 30-second audio review for Café Mocha.','{"mission_id":"demo-mission-123"}'::jsonb,'/earn?mission=demo-mission-123','Per-mission deep link from share sheet','Opens claim flow directly inside /earn.',80),
('appt-30','calendar','appointment','Appointment in 30 min','Get ready — tap for details.','{"appointment_id":"demo-appt-456"}'::jsonb,NULL,'15–45 min before appointment_date','One-time per appointment (24 h dedupe).',90)
ON CONFLICT (slug) DO NOTHING;
