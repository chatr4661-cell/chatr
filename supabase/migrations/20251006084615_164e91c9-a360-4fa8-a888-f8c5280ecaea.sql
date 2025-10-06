-- Update default ringtones for calls and messages
ALTER TABLE profiles 
  ALTER COLUMN call_ringtone SET DEFAULT '/ringtones/perfect-ring.mp3';

ALTER TABLE profiles 
  ALTER COLUMN notification_tone SET DEFAULT '/ringtones/trap-text.mp3';