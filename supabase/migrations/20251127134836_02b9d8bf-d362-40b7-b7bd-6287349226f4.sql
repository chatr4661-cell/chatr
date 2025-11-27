-- 1. Create the native_apps table for app launcher
CREATE TABLE IF NOT EXISTS public.native_apps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  package_name TEXT NOT NULL UNIQUE,
  web_url TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  category TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.native_apps ENABLE ROW LEVEL SECURITY;

-- 3. Allow public read access (anyone can browse apps)
CREATE POLICY "Anyone can view native apps"
ON public.native_apps
FOR SELECT
USING (true);

-- 4. Seed with Top 20 Essential Indian Apps
INSERT INTO public.native_apps (name, category, package_name, web_url, icon_url, is_featured) VALUES
('Flipkart', 'Shopping', 'com.flipkart.android', 'https://www.flipkart.com', 'https://upload.wikimedia.org/wikipedia/en/7/7a/Flipkart_logo.svg', true),
('Amazon India', 'Shopping', 'in.amazon.mShop.android.shopping', 'https://www.amazon.in', 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg', true),
('Zomato', 'Food', 'com.application.zomato', 'https://www.zomato.com', 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Zomato_Logo.svg', true),
('Swiggy', 'Food', 'in.swiggy.android', 'https://www.swiggy.com', 'https://upload.wikimedia.org/wikipedia/en/1/12/Swiggy_logo.svg', true),
('Blinkit', 'Grocery', 'com.grofers.customerapp', 'https://blinkit.com', 'https://upload.wikimedia.org/wikipedia/commons/2/28/Blinkit_logo.svg', true),
('Zepto', 'Grocery', 'com.zeptonow.consumer', 'https://www.zeptonow.com', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Zepto_Logo.svg/1200px-Zepto_Logo.svg.png', true),
('Paytm', 'Finance', 'net.one97.paytm', 'https://paytm.com', 'https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg', true),
('PhonePe', 'Finance', 'com.phonepe.app', 'https://www.phonepe.com', 'https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg', true),
('Google Pay', 'Finance', 'com.google.android.apps.nbu.paisa.user', 'https://pay.google.com', 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Pay_Logo_%282020%29.svg', true),
('Ola', 'Travel', 'com.olacabs.customer', 'https://www.olacabs.com', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Ola_Cabs_logo.svg', true),
('Uber', 'Travel', 'com.ubercab', 'https://m.uber.com', 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png', true),
('Makemytrip', 'Travel', 'com.makemytrip', 'https://www.makemytrip.com', 'https://upload.wikimedia.org/wikipedia/commons/8/84/MakeMyTrip_Logo.png', true),
('IRCTC Rail Connect', 'Travel', 'cris.org.in.prs.ima', 'https://www.irctc.co.in', 'https://upload.wikimedia.org/wikipedia/en/4/45/IRCTC_Logo.svg', false),
('Urban Company', 'Services', 'com.urbanclap.urbanclap', 'https://www.urbancompany.com', 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Urban_Company_Logo.svg', true),
('Meesho', 'Shopping', 'com.meesho.supply', 'https://www.meesho.com', 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Meesho_logo.png', false),
('Myntra', 'Fashion', 'com.myntra.android', 'https://www.myntra.com', 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Myntra_Logo.png', true),
('Nykaa', 'Fashion', 'com.fsn.nykaa', 'https://www.nykaa.com', 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Nykaa_Logo.png', false),
('Tata 1mg', 'Health', 'com.aranoah.healthkart.plus', 'https://www.1mg.com', 'https://upload.wikimedia.org/wikipedia/commons/a/a2/1mg_Logo.svg', false),
('Practo', 'Health', 'com.practo.fabric', 'https://www.practo.com', 'https://upload.wikimedia.org/wikipedia/en/6/64/Practo_new_logo.png', false),
('BookMyShow', 'Entertainment', 'com.bt.bms', 'https://in.bookmyshow.com', 'https://upload.wikimedia.org/wikipedia/commons/b/b7/BookMyShow_logo.svg', false)
ON CONFLICT (package_name) DO NOTHING;