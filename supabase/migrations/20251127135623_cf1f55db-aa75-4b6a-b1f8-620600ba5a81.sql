-- Add 30+ more popular Indian apps to reach 50+ total
INSERT INTO public.native_apps (name, category, package_name, web_url, icon_url, is_featured) VALUES
-- More Shopping
('Ajio', 'Shopping', 'com.ajio.shop', 'https://www.ajio.com', 'https://upload.wikimedia.org/wikipedia/commons/f/fd/AJIO_Logo.svg', false),
('Snapdeal', 'Shopping', 'com.snapdeal.main', 'https://www.snapdeal.com', 'https://upload.wikimedia.org/wikipedia/en/8/83/Snapdeal_logo.png', false),
('ShopClues', 'Shopping', 'com.shopclues', 'https://www.shopclues.com', 'https://companieslogo.com/img/orig/SHOP.NS-c2d8e4e4.png', false),
('JioMart', 'Grocery', 'com.jpl.jiomart', 'https://www.jiomart.com', 'https://www.jiomart.com/assets/ds2web/jds-icons/jiomart-logo.png', false),

-- Finance & Investment
('CRED', 'Finance', 'com.dreamplug.androidapp', 'https://cred.club', 'https://web-images.credcdn.in/_next/assets/images/home-page/cred-logo.png', true),
('Groww', 'Finance', 'com.nextbillion.groww', 'https://groww.in', 'https://groww.in/logo-web.svg', true),
('Zerodha Kite', 'Finance', 'com.zerodha.kite3', 'https://kite.zerodha.com', 'https://zerodha.com/static/images/logo.svg', false),
('Upstox', 'Finance', 'in.upstox.app', 'https://upstox.com', 'https://assets-netstorage.groww.in/stock-assets/logos/upstox.png', false),
('BHIM UPI', 'Finance', 'in.org.npci.upiapp', 'https://www.bhimupi.org.in', 'https://upload.wikimedia.org/wikipedia/commons/4/4f/BHIM_SVG_Logo.svg', false),
('MobiKwik', 'Finance', 'com.mobikwik_new', 'https://www.mobikwik.com', 'https://www.mobikwik.com/images/logo.png', false),

-- Food Delivery
('Dominos Pizza', 'Food', 'com.app.dominos', 'https://www.dominos.co.in', 'https://upload.wikimedia.org/wikipedia/en/7/74/Dominos_pizza_logo.svg', false),
('McDonald''s India', 'Food', 'com.mcdonalds.mobileapp', 'https://www.mcdonaldsindia.com', 'https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg', false),
('KFC India', 'Food', 'com.yum.kfc', 'https://online.kfc.co.in', 'https://upload.wikimedia.org/wikipedia/en/b/bf/KFC_logo.svg', false),

-- Entertainment & OTT
('Hotstar', 'Entertainment', 'in.startv.hotstar', 'https://www.hotstar.com', 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg', true),
('Netflix', 'Entertainment', 'com.netflix.mediaclient', 'https://www.netflix.com', 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', true),
('Amazon Prime Video', 'Entertainment', 'com.amazon.avod.thirdpartyclient', 'https://www.primevideo.com', 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', true),
('JioCinema', 'Entertainment', 'com.jio.media.jiobeats', 'https://www.jiocinema.com', 'https://www.jiocinema.com/images/jc_logo_v2.svg', false),
('Spotify', 'Entertainment', 'com.spotify.music', 'https://open.spotify.com', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', false),
('Gaana', 'Entertainment', 'com.gaana', 'https://gaana.com', 'https://a10.gaanacdn.com/images/gaana_logo_colored.svg', false),
('YouTube', 'Entertainment', 'com.google.android.youtube', 'https://www.youtube.com', 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg', true),

-- Travel & Booking
('Goibibo', 'Travel', 'com.goibibo', 'https://www.goibibo.com', 'https://upload.wikimedia.org/wikipedia/commons/9/99/Goibibo_Logo.png', false),
('Yatra', 'Travel', 'com.yatra', 'https://www.yatra.com', 'https://imgak.mmtcdn.com/pwa_v3/pwa_hotel_assets/header/yatra_logo.png', false),
('EaseMyTrip', 'Travel', 'com.easemytrip', 'https://www.easemytrip.com', 'https://www.easemytrip.com/images/emt-logo.svg', false),
('Rapido', 'Travel', 'com.rapido.passenger', 'https://www.rapido.bike', 'https://upload.wikimedia.org/wikipedia/commons/3/31/Rapido_Logo.png', false),
('Redbus', 'Travel', 'in.redbus.android', 'https://www.redbus.in', 'https://upload.wikimedia.org/wikipedia/commons/e/e7/RedBus_logo.png', false),

-- Health & Wellness
('PharmEasy', 'Health', 'com.phonegap.rxpal', 'https://pharmeasy.in', 'https://assets.pharmeasy.in/web-assets/dist/fca22bc9.svg', false),
('Apollo 24/7', 'Health', 'com.apollo247.consumer', 'https://www.apollo247.com', 'https://newassets.apollo247.com/images/ic_logo.svg', false),
('Netmeds', 'Health', 'com.NetmedsMarketplace.Netmeds', 'https://www.netmeds.com', 'https://www.netmeds.com/images/cms/aw_rbslider/slides/1587375646_Netmeds-logo.png', false),

-- Services
('Dunzo', 'Services', 'com.dunzo.user', 'https://www.dunzo.com', 'https://d1flzashw70bti.cloudfront.net/original/dunzo-logo.png', false),
('Porter', 'Services', 'in.porter.android.customer', 'https://porter.in', 'https://porter.in/static/media/logo.png', false),
('Justdial', 'Services', 'com.justdial.search', 'https://www.justdial.com', 'https://upload.wikimedia.org/wikipedia/commons/3/30/Just_Dial_logo.svg', false),

-- Education & Jobs
('LinkedIn', 'Services', 'com.linkedin.android', 'https://www.linkedin.com', 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png', false),
('Naukri.com', 'Services', 'naukri.com.android', 'https://www.naukri.com', 'https://static.naukimg.com/s/4/100/i/naukri_Logo.png', false),
('Unacademy', 'Entertainment', 'com.unacademyapp', 'https://unacademy.com', 'https://static.uacdn.net/production/_next/static/images/logo.svg', false),
('BYJU''S', 'Entertainment', 'com.byjus.thelearningapp', 'https://byjus.com', 'https://akm-img-a-in.tosshub.com/sites/visualstory/wp/2022/05/Byjus-logo.jpg', false);
