
CREATE TABLE public.doctor_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability is publicly viewable"
  ON public.doctor_availability FOR SELECT USING (true);

CREATE POLICY "Doctors manage own availability"
  ON public.doctor_availability FOR ALL
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE TRIGGER update_doctor_availability_updated_at
  BEFORE UPDATE ON public.doctor_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_doctor_availability_doctor ON public.doctor_availability(doctor_id);

-- Extend appointments policies for patient & provider visibility/management
CREATE POLICY "Patient or provider can view appointment"
  ON public.appointments FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = provider_id);

CREATE POLICY "Patient or provider can update appointment"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = patient_id OR auth.uid() = provider_id);

CREATE POLICY "Patient can cancel own appointment"
  ON public.appointments FOR DELETE
  USING (auth.uid() = patient_id);
