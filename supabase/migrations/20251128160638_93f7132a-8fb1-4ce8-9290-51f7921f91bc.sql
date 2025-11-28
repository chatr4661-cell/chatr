-- Update existing apps with better/working icon URLs
UPDATE public.native_apps SET icon_url = 'https://assets-netstorage.groww.in/web-assets/billion_groww_desktop/prod/_next/static/media/logo-light.8c1e2c8b.svg' WHERE package_name = 'com.nextbillion.groww';
UPDATE public.native_apps SET icon_url = 'https://img10.hotstar.com/image/upload/f_auto,q_90,w_1920/v1656431456/web-images/logo-d-plus.svg' WHERE package_name = 'in.startv.hotstar';
UPDATE public.native_apps SET icon_url = 'https://imgak.mmtcdn.com/pwa_v3/pwa_commons_assets/desktop/logo-header.png' WHERE package_name = 'com.makemytrip';
UPDATE public.native_apps SET icon_url = 'https://olawebcdn.com/images/v1/ola_logo.svg' WHERE package_name = 'in.olacabs.customer';
UPDATE public.native_apps SET icon_url = 'https://web.swiggy.com/web-assets/img/swiggy.svg' WHERE package_name = 'in.swiggy.android';
UPDATE public.native_apps SET icon_url = 'https://www.urbancompany.com/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Furbanclap%2Fimage%2Fupload%2Fimages%2Fsupply%2Fcustomer-app-supply%2F1678864303680-4ded67.jpeg&w=96&q=75' WHERE package_name = 'com.urbanclap.urbanclap';
UPDATE public.native_apps SET icon_url = 'https://cdn.zeptonow.com/app/assets/zepto_logo.png' WHERE package_name = 'com.zepto';
UPDATE public.native_apps SET icon_url = 'https://assets.ajio.com/cms/AJIO/WEB/D-1.0-UHP-21052021-MainBannerDailystrip-Z1-P4-ajiobrand-min40extra10.jpg' WHERE package_name = 'com.ajio.shop';
UPDATE public.native_apps SET icon_url = 'https://assets.pharmeasy.in/apothecary/images/medicine_ff.webp?dim=256x0' WHERE package_name = 'com.phonegap.rxpal';
UPDATE public.native_apps SET icon_url = 'https://cdn.icon-icons.com/icons2/2699/PNG/512/spotify_logo_icon_170837.png' WHERE package_name = 'com.spotify.music';

-- Add 35+ more popular Indian apps to reach 70 total
INSERT INTO public.native_apps (name, category, package_name, web_url, icon_url, is_featured) VALUES
-- More Shopping Apps
('Tata CLiQ', 'Shopping', 'com.tul.tatacliq', 'https://www.tatacliq.com', 'https://www.tatacliq.com/src/general/components/img/CLiQ-logo.svg', false),
('FirstCry', 'Shopping', 'com.mahindracomviva.firstcry', 'https://www.firstcry.com', 'https://cdn.fcglcdn.com/brainbees/images/n/fc_logo_white.png', false),
('Lenskart', 'Shopping', 'com.lenskart.app', 'https://www.lenskart.com', 'https://static.lenskart.com/media/desktop/img/site-images/main_logo.svg', false),
('Shopsy', 'Shopping', 'in.shopsy.android', 'https://www.shopsy.in', 'https://cdn.shopsy.in/shopsywebsite/images/landing/shopsy-logo.png', false),
('Nykaafashion', 'Fashion', 'com.nykaa.nykfashion', 'https://www.nykaafashion.com', 'https://images-static.nykaa.com/nykaaFashionMedia/media/NYKAA_FASHION_LOGO.png', false),
('Bewakoof', 'Fashion', 'com.bewakoof.bewakoof', 'https://www.bewakoof.com', 'https://images.bewakoof.com/web/bwkf-logo-trimmed.svg', false),

-- More Food & Grocery
('BigBasket', 'Grocery', 'com.bigbasket.mobileapp', 'https://www.bigbasket.com', 'https://www.bigbasket.com/media/logo/bigbasket-logo.svg', true),
('1mg', 'Health', 'com.aranoah.healthkart.plus', 'https://www.1mg.com', 'https://onemg.gumlet.io/images/header_logo_new.svg', false),
('Box8', 'Food', 'com.box8.food', 'https://www.box8.in', 'https://www.box8.in/assets/images/box8-logo.svg', false),
('Faasos', 'Food', 'com.faasos', 'https://www.faasos.com', 'https://assets.faasos.io/production/web/images/logo/faasos-logo.svg', false),
('FreshMenu', 'Food', 'com.freshmenu.android', 'https://www.freshmenu.com', 'https://www.freshmenu.com/assets/images/logo.svg', false),

-- Finance & Banking
('Paytm Money', 'Finance', 'com.pml.paytmmoney', 'https://www.paytmmoney.com', 'https://paytmmoney.com/assets/images/logo.svg', false),
('Angel One', 'Finance', 'com.msf.angelmobile', 'https://www.angelone.in', 'https://www.angelone.in/images/logo.svg', false),
('ICICI Bank', 'Finance', 'com.csam.icici.bank.imobile', 'https://www.icicibank.com', 'https://www.icicibank.com/content/dam/icicibank/india/assets/images/header/logo.png', false),
('HDFC Bank', 'Finance', 'com.snapwork.hdfc', 'https://www.hdfcbank.com', 'https://www.hdfcbank.com/content/api/contentstream-id/723fb80a-2dde-42a3-9793-7ae1be57c87f/ff3f0307-738a-4f60-a8e7-ee0c83d7d56c/Personal/Pay/logo/HDFC-Bank-Logo.png', false),
('SBI YONO', 'Finance', 'com.sbi.lotusintouch', 'https://www.onlinesbi.com', 'https://bank.sbi/SBI-YONO-Logo.svg', false),
('Kuvera', 'Finance', 'com.kuvera.investments', 'https://kuvera.in', 'https://assets.kuvera.in/assets/images/logo/kuvera-logo.svg', false),

-- Entertainment & Media
('Zee5', 'Entertainment', 'com.graymatrix.did', 'https://www.zee5.com', 'https://www.zee5.com/images/ZEE5_logo.png', false),
('SonyLiv', 'Entertainment', 'com.sonyliv', 'https://www.sonyliv.com', 'https://images.sonyliv.com/images/responsive/sonyliv_logo.png', false),
('Voot', 'Entertainment', 'com.tv.v18.viola', 'https://www.voot.com', 'https://v3img.voot.com/v3Storage/assets/voot-new-logo-14-1656670593617.svg', false),
('MX Player', 'Entertainment', 'com.mxtech.videoplayer.ad', 'https://www.mxplayer.in', 'https://www.mxplayer.in/images/mx-player-logo.svg', false),
('Wynk Music', 'Entertainment', 'com.bsbportal.music', 'https://wynk.in', 'https://wynk.in/assets/images/logo-white.svg', false),

-- Travel & Transport
('InDrive', 'Travel', 'sinet.startup.inDriver', 'https://indrive.com', 'https://static.indrive.com/images/logo-white.svg', false),
('Uber Eats', 'Food', 'com.ubercab.eats', 'https://www.ubereats.com', 'https://d3i4yxtzktqr9n.cloudfront.net/web-eats-v2/logo-uber-eats.svg', false),
('Bounce', 'Travel', 'in.bounce.bounceapp', 'https://www.bounce.bike', 'https://www.bounce.bike/assets/img/bounce-logo.svg', false),
('Vogo', 'Travel', 'com.vogoapp.user', 'https://www.vogo.in', 'https://www.vogo.in/img/logo.svg', false),

-- Gaming & Entertainment
('MPL', 'Entertainment', 'com.mpl.mobile', 'https://www.mpl.live', 'https://static.mpl.live/mpl-live/images/mpl-logo.svg', false),
('Dream11', 'Entertainment', 'com.dream11.fantasy', 'https://www.dream11.com', 'https://www.dream11.com/images/d11-logo.svg', true),
('Paytm First Games', 'Entertainment', 'com.paytm.games', 'https://www.paytmfirstgames.com', 'https://paytmfirstgames.com/assets/images/logo.svg', false),

-- News & Media
('Inshorts', 'Entertainment', 'com.nis.app', 'https://www.inshorts.com', 'https://assets.inshorts.com/website_assets/images/logo_inshorts.png', false),
('Dailyhunt', 'Entertainment', 'com.eterno', 'https://www.dailyhunt.in', 'https://static.dailyhunt.in/img/dh-logo.svg', false),
('Google News', 'Entertainment', 'com.google.android.apps.magazines', 'https://news.google.com', 'https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png', false),

-- Social & Communication
('ShareChat', 'Entertainment', 'in.mohalla.sharechat', 'https://sharechat.com', 'https://sharechat.com/assets/images/logo.svg', false),
('Moj', 'Entertainment', 'com.mohalla.moj', 'https://mojapp.in', 'https://mojapp.in/assets/images/moj-logo.svg', false),
('Josh', 'Entertainment', 'com.dailyhunt.josh', 'https://www.josh.in', 'https://www.josh.in/assets/images/josh-logo.svg', false),

-- Utilities & Services
('Google Maps', 'Travel', 'com.google.android.apps.maps', 'https://www.google.com/maps', 'https://www.google.com/images/branding/product/2x/maps_96in128dp.png', true),
('WhatsApp Business', 'Services', 'com.whatsapp.w4b', 'https://www.whatsapp.com/business', 'https://static.whatsapp.net/rsrc.php/v3/yP/r/rYZqPCBaG70.png', false),
('Truecaller', 'Services', 'com.truecaller', 'https://www.truecaller.com', 'https://www.truecaller.com/cms/images/logo_og.png', false),
('Google Drive', 'Services', 'com.google.android.apps.docs', 'https://drive.google.com', 'https://www.google.com/images/branding/product/2x/drive_48dp.png', false),
('Google Photos', 'Services', 'com.google.android.apps.photos', 'https://photos.google.com', 'https://www.google.com/images/branding/product/2x/photos_96in128dp.png', false)
ON CONFLICT (package_name) DO NOTHING;