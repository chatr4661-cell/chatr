-- Update all existing QR code URLs to use chatr.chat domain
UPDATE chatr_referral_codes 
SET qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' || 
                  'https%3A%2F%2Fchatr.chat%2Fauth%3Fref%3D' || code
WHERE qr_code_url LIKE '%chatr.app%' OR qr_code_url IS NULL;