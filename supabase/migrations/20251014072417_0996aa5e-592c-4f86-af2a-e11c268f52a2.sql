-- Fix Home Service Pro app_url to point to internal route
UPDATE mini_apps 
SET app_url = '/home-services' 
WHERE app_name = 'Home Service Pro';