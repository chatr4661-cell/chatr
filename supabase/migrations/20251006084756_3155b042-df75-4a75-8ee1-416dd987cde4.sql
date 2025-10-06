-- Update all existing users to use new default ringtones
UPDATE profiles 
SET 
  call_ringtone = '/ringtones/perfect-ring.mp3',
  notification_tone = '/ringtones/trap-text.mp3'
WHERE call_ringtone = '/ringtone.mp3' 
   OR notification_tone = '/notification.mp3';