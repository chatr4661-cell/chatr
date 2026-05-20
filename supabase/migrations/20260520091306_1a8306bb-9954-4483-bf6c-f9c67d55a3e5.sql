
CREATE TABLE public.dhandha_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  outstanding_balance NUMERIC NOT NULL DEFAULT 0,
  total_billed NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dhandha_customers_merchant ON public.dhandha_customers(merchant_id);
CREATE INDEX idx_dhandha_customers_phone ON public.dhandha_customers(merchant_id, phone);
ALTER TABLE public.dhandha_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants view own customers"
ON public.dhandha_customers FOR SELECT
USING (merchant_id IN (SELECT id FROM public.merchant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Merchants create own customers"
ON public.dhandha_customers FOR INSERT
WITH CHECK (merchant_id IN (SELECT id FROM public.merchant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Merchants update own customers"
ON public.dhandha_customers FOR UPDATE
USING (merchant_id IN (SELECT id FROM public.merchant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Merchants delete own customers"
ON public.dhandha_customers FOR DELETE
USING (merchant_id IN (SELECT id FROM public.merchant_profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_dhandha_customers_updated_at
BEFORE UPDATE ON public.dhandha_customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.dhandha_transactions
  ADD COLUMN customer_id UUID REFERENCES public.dhandha_customers(id) ON DELETE SET NULL;
CREATE INDEX idx_dhandha_transactions_customer ON public.dhandha_transactions(customer_id);

CREATE OR REPLACE FUNCTION public.dhandha_customer_balance_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  amt NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE public.dhandha_customers
        SET total_billed = total_billed + NEW.amount,
            outstanding_balance = outstanding_balance + CASE WHEN NEW.status = 'paid' THEN 0 ELSE NEW.amount END,
            total_paid = total_paid + CASE WHEN NEW.status = 'paid' THEN NEW.amount ELSE 0 END
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.customer_id IS NOT NULL THEN
      IF OLD.status <> 'paid' AND NEW.status = 'paid' THEN
        UPDATE public.dhandha_customers
          SET outstanding_balance = GREATEST(outstanding_balance - NEW.amount, 0),
              total_paid = total_paid + NEW.amount
          WHERE id = NEW.customer_id;
      ELSIF OLD.status = 'paid' AND NEW.status <> 'paid' THEN
        UPDATE public.dhandha_customers
          SET outstanding_balance = outstanding_balance + NEW.amount,
              total_paid = GREATEST(total_paid - NEW.amount, 0)
          WHERE id = NEW.customer_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.customer_id IS NOT NULL THEN
      UPDATE public.dhandha_customers
        SET total_billed = GREATEST(total_billed - OLD.amount, 0),
            outstanding_balance = GREATEST(outstanding_balance - CASE WHEN OLD.status = 'paid' THEN 0 ELSE OLD.amount END, 0),
            total_paid = GREATEST(total_paid - CASE WHEN OLD.status = 'paid' THEN OLD.amount ELSE 0 END, 0)
        WHERE id = OLD.customer_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER dhandha_customer_balance_sync_t
AFTER INSERT OR UPDATE OR DELETE ON public.dhandha_transactions
FOR EACH ROW EXECUTE FUNCTION public.dhandha_customer_balance_sync();
