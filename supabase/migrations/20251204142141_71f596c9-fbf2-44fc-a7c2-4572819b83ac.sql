-- Add encryption IV column to messages table for decryption
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS encrypted_iv text;

-- Add encrypted_key column for the symmetric key encrypted with recipient's public key
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS encrypted_key text;

-- Create index for faster encrypted message queries
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON public.messages(is_encrypted) WHERE is_encrypted = true;