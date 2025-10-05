-- Update default status message from HealthMessenger to Chatr
ALTER TABLE profiles 
ALTER COLUMN status SET DEFAULT 'Hey there! I am using Chatr';