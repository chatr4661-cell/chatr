-- Add comprehensive health passport fields
ALTER TABLE health_passport
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS home_address TEXT,
ADD COLUMN IF NOT EXISTS current_address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS current_medications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS past_medical_history JSONB DEFAULT '{"surgeries": [], "hospitalizations": [], "major_illnesses": []}'::jsonb,
ADD COLUMN IF NOT EXISTS vaccination_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS family_medical_history TEXT,
ADD COLUMN IF NOT EXISTS primary_physician_name TEXT,
ADD COLUMN IF NOT EXISTS primary_physician_contact TEXT,
ADD COLUMN IF NOT EXISTS specialists JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS preferred_hospital TEXT,
ADD COLUMN IF NOT EXISTS implanted_devices TEXT,
ADD COLUMN IF NOT EXISTS dnr_order BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS organ_donor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS special_medical_needs TEXT;