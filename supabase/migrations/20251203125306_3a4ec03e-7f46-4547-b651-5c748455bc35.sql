-- Fix function search_path for stealth mode function
CREATE OR REPLACE FUNCTION update_stealth_mode_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;