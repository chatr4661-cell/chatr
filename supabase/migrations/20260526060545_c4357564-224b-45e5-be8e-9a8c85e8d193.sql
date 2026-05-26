
-- Catalog table
CREATE TABLE public.home_solutions_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.home_solutions_category NOT NULL,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_label TEXT,
  unit TEXT,
  tag TEXT,
  tag_color TEXT,
  rating NUMERIC(2,1),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hsc_category_active ON public.home_solutions_catalog(category, is_active, sort_order);

ALTER TABLE public.home_solutions_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active catalog"
  ON public.home_solutions_catalog FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage catalog"
  ON public.home_solutions_catalog FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_hsc_updated_at
  BEFORE UPDATE ON public.home_solutions_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bookings: payment + cancellation columns
ALTER TABLE public.home_solutions_bookings
  ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod','upi_advance','upi_full')),
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','failed')),
  ADD COLUMN cancellation_reason TEXT;

-- Server-side pricing trigger
CREATE OR REPLACE FUNCTION public.recompute_home_solutions_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC(10,2) := 0;
  v_item JSONB;
  v_price NUMERIC(10,2);
  v_qty INT;
  v_unit NUMERIC(10,2);
BEGIN
  IF NEW.category = 'material' THEN
    -- Materials: items is an array of {id, qty}
    FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      SELECT unit_price INTO v_unit
        FROM public.home_solutions_catalog
        WHERE code = (v_item->>'id') AND is_active = true;
      IF v_unit IS NULL THEN
        RAISE EXCEPTION 'Invalid catalog item: %', v_item->>'id';
      END IF;
      v_qty := COALESCE((v_item->>'qty')::INT, 1);
      v_total := v_total + (v_unit * v_qty);
    END LOOP;
    NEW.total_amount := v_total;
  ELSE
    -- Worker / interior: single item × quantity
    SELECT unit_price INTO v_unit
      FROM public.home_solutions_catalog
      WHERE code = NEW.item_code AND is_active = true;
    IF v_unit IS NULL THEN
      -- Custom-quote items have unit_price 0 → leave total NULL
      NEW.total_amount := NULL;
    ELSIF v_unit = 0 THEN
      NEW.total_amount := NULL;
    ELSE
      NEW.total_amount := v_unit * GREATEST(NEW.quantity, 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hsb_recompute_total
  BEFORE INSERT OR UPDATE OF items, quantity, item_code, category
  ON public.home_solutions_bookings
  FOR EACH ROW EXECUTE FUNCTION public.recompute_home_solutions_total();

-- Vendor & admin access to all bookings
CREATE POLICY "Vendors and admins view all bookings"
  ON public.home_solutions_bookings FOR SELECT
  USING (public.has_role(auth.uid(), 'vendor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors and admins update bookings"
  ON public.home_solutions_bookings FOR UPDATE
  USING (public.has_role(auth.uid(), 'vendor') OR public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER TABLE public.home_solutions_bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.home_solutions_bookings;
