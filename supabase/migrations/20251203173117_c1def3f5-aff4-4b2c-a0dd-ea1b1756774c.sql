-- KYC Verification Tables
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('aadhaar', 'pan', 'gst', 'bank_statement', 'business_proof')),
  document_url TEXT NOT NULL,
  document_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own KYC docs" ON public.kyc_documents;
CREATE POLICY "Users can view own KYC docs" ON public.kyc_documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own KYC docs" ON public.kyc_documents;
CREATE POLICY "Users can insert own KYC docs" ON public.kyc_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- FCM Tokens Table
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  device_type TEXT DEFAULT 'android',
  device_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own FCM tokens" ON public.fcm_tokens;
CREATE POLICY "Users can manage own FCM tokens" ON public.fcm_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Encrypted Messages Table (for E2E)
CREATE TABLE IF NOT EXISTS public.encrypted_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  encrypted_content TEXT NOT NULL,
  iv TEXT NOT NULL,
  key_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.encrypted_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own encrypted messages" ON public.encrypted_messages;
CREATE POLICY "Users can view own encrypted messages" ON public.encrypted_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can insert encrypted messages" ON public.encrypted_messages;
CREATE POLICY "Users can insert encrypted messages" ON public.encrypted_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Notification Queue Table
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notification_queue;
CREATE POLICY "Users can view own notifications" ON public.notification_queue
  FOR SELECT USING (auth.uid() = user_id);