ALTER TABLE device_tokens 
ADD CONSTRAINT device_tokens_user_device_unique 
UNIQUE (user_id, device_token);