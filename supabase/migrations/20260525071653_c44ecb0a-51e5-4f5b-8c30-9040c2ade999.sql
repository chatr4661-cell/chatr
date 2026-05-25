
CREATE TYPE public.home_solutions_category AS ENUM ('worker', 'interior', 'material');
CREATE TYPE public.home_solutions_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.home_solutions_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.home_solutions_category NOT NULL,
  item_code TEXT NOT NULL,
  item_title TEXT NOT NULL,
  item_icon TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  quantity INT NOT NULL DEFAULT 1,
  price_label TEXT,
  total_amount NUMERIC(10,2),
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  preferred_date DATE,
  notes TEXT,
  status public.home_solutions_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hsb_user_date ON public.home_solutions_bookings(user_id, created_at DESC);

ALTER TABLE public.home_solutions_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bookings" ON public.home_solutions_bookings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own bookings" ON public.home_solutions_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bookings" ON public.home_solutions_bookings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own bookings" ON public.home_solutions_bookings
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_hsb_updated_at
  BEFORE UPDATE ON public.home_solutions_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
