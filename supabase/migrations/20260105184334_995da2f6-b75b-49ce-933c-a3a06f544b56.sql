
-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns for health data
ALTER TABLE public.bmi_records 
ADD COLUMN IF NOT EXISTS weight_encrypted bytea,
ADD COLUMN IF NOT EXISTS height_encrypted bytea,
ADD COLUMN IF NOT EXISTS bmi_encrypted bytea;

-- Add encrypted columns for KYC documents
ALTER TABLE public.kyc_documents
ADD COLUMN IF NOT EXISTS document_number_encrypted bytea;

-- Create encryption helper function for health data
CREATE OR REPLACE FUNCTION encrypt_health_value(value numeric, user_id uuid)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgp_sym_encrypt(
    value::text, 
    encode(digest(user_id::text || 'chatr_health_key_v1', 'sha256'), 'hex')
  );
END;
$$;

-- Create decryption helper function for health data
CREATE OR REPLACE FUNCTION decrypt_health_value(encrypted_value bytea, user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF encrypted_value IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN pgp_sym_decrypt(
    encrypted_value,
    encode(digest(user_id::text || 'chatr_health_key_v1', 'sha256'), 'hex')
  )::numeric;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Create encryption helper for KYC document numbers
CREATE OR REPLACE FUNCTION encrypt_kyc_value(value text, user_id uuid)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN pgp_sym_encrypt(
    value, 
    encode(digest(user_id::text || 'chatr_kyc_key_v1', 'sha256'), 'hex')
  );
END;
$$;

-- Create decryption helper for KYC document numbers
CREATE OR REPLACE FUNCTION decrypt_kyc_value(encrypted_value bytea, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF encrypted_value IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN pgp_sym_decrypt(
    encrypted_value,
    encode(digest(user_id::text || 'chatr_kyc_key_v1', 'sha256'), 'hex')
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Create trigger to auto-encrypt health data on insert/update
CREATE OR REPLACE FUNCTION encrypt_bmi_on_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.weight_encrypted := encrypt_health_value(NEW.weight_kg, NEW.user_id);
  NEW.height_encrypted := encrypt_health_value(NEW.height_cm, NEW.user_id);
  NEW.bmi_encrypted := encrypt_health_value(NEW.bmi_value, NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_encrypt_bmi ON public.bmi_records;
CREATE TRIGGER trigger_encrypt_bmi
BEFORE INSERT OR UPDATE ON public.bmi_records
FOR EACH ROW
EXECUTE FUNCTION encrypt_bmi_on_save();

-- Create trigger to auto-encrypt KYC document number on insert/update
CREATE OR REPLACE FUNCTION encrypt_kyc_on_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.document_number IS NOT NULL THEN
    NEW.document_number_encrypted := encrypt_kyc_value(NEW.document_number, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_encrypt_kyc ON public.kyc_documents;
CREATE TRIGGER trigger_encrypt_kyc
BEFORE INSERT OR UPDATE ON public.kyc_documents
FOR EACH ROW
EXECUTE FUNCTION encrypt_kyc_on_save();

-- Add comment for documentation
COMMENT ON COLUMN bmi_records.weight_encrypted IS 'AES-256 encrypted weight using user-specific key';
COMMENT ON COLUMN bmi_records.height_encrypted IS 'AES-256 encrypted height using user-specific key';
COMMENT ON COLUMN bmi_records.bmi_encrypted IS 'AES-256 encrypted BMI value using user-specific key';
COMMENT ON COLUMN kyc_documents.document_number_encrypted IS 'AES-256 encrypted document number using user-specific key';
