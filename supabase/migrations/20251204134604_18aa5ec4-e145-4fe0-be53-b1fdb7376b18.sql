
-- Table to track Gmail imported contacts
CREATE TABLE IF NOT EXISTS public.gmail_imported_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_contact_id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  is_chatr_user BOOLEAN DEFAULT false,
  chatr_user_id UUID REFERENCES public.profiles(id),
  imported_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, email),
  UNIQUE(user_id, phone)
);

-- Table to track invites sent
CREATE TABLE IF NOT EXISTS public.contact_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_email TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  invite_method TEXT NOT NULL CHECK (invite_method IN ('sms', 'whatsapp', 'email')),
  invite_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'joined')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  clicked_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  joined_user_id UUID REFERENCES auth.users(id),
  reward_given BOOLEAN DEFAULT false,
  UNIQUE(inviter_id, contact_email),
  UNIQUE(inviter_id, contact_phone)
);

-- Enable RLS
ALTER TABLE public.gmail_imported_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for gmail_imported_contacts
CREATE POLICY "Users can view own imported contacts"
  ON public.gmail_imported_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own imported contacts"
  ON public.gmail_imported_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own imported contacts"
  ON public.gmail_imported_contacts FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for contact_invites
CREATE POLICY "Users can view own invites"
  ON public.contact_invites FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can insert own invites"
  ON public.contact_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update own invites"
  ON public.contact_invites FOR UPDATE
  USING (auth.uid() = inviter_id);

-- Function to process invite when new user joins
CREATE OR REPLACE FUNCTION public.process_invite_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  reward_amount INTEGER := 50;
BEGIN
  -- Check if this user's email/phone was invited
  SELECT * INTO invite_record
  FROM contact_invites
  WHERE (contact_email = NEW.email OR contact_phone = NEW.phone_number)
    AND status IN ('pending', 'sent', 'clicked')
    AND reward_given = false
  LIMIT 1;
  
  IF invite_record IS NOT NULL THEN
    -- Update invite status
    UPDATE contact_invites
    SET status = 'joined',
        joined_at = now(),
        joined_user_id = NEW.id,
        reward_given = true
    WHERE id = invite_record.id;
    
    -- Reward the inviter
    UPDATE user_points
    SET balance = balance + reward_amount,
        lifetime_earned = lifetime_earned + reward_amount
    WHERE user_id = invite_record.inviter_id;
    
    -- Log the reward transaction
    INSERT INTO point_transactions (user_id, amount, transaction_type, source, description)
    VALUES (invite_record.inviter_id, reward_amount, 'earn', 'referral', 
            'Friend ' || COALESCE(NEW.username, NEW.email, 'Someone') || ' joined via your invite!');
    
    -- Also reward the new user
    UPDATE user_points
    SET balance = balance + 25,
        lifetime_earned = lifetime_earned + 25
    WHERE user_id = NEW.id;
    
    INSERT INTO point_transactions (user_id, amount, transaction_type, source, description)
    VALUES (NEW.id, 25, 'earn', 'referral_bonus', 'Welcome bonus for joining via invite!');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to process invites on new profile creation
DROP TRIGGER IF EXISTS on_profile_created_check_invite ON public.profiles;
CREATE TRIGGER on_profile_created_check_invite
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.process_invite_signup();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gmail_contacts_user ON public.gmail_imported_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_contacts_email ON public.gmail_imported_contacts(email);
CREATE INDEX IF NOT EXISTS idx_gmail_contacts_phone ON public.gmail_imported_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contact_invites_email ON public.contact_invites(contact_email);
CREATE INDEX IF NOT EXISTS idx_contact_invites_phone ON public.contact_invites(contact_phone);
CREATE INDEX IF NOT EXISTS idx_contact_invites_code ON public.contact_invites(invite_code);
