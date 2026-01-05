-- Create vendor roles enum if not exists
DO $$ BEGIN
    CREATE TYPE public.vendor_type AS ENUM ('restaurant', 'deal_merchant', 'healthcare_provider');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create vendors table if not exists
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    vendor_type vendor_type NOT NULL,
    business_name TEXT NOT NULL,
    business_email TEXT,
    business_phone TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    description TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    gst_number TEXT,
    pan_number TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    bank_account_holder TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    verification_status TEXT DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    rating DECIMAL(2,1) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns to existing food_orders table
ALTER TABLE public.food_orders 
    ADD COLUMN IF NOT EXISTS order_number TEXT,
    ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS packaging_charge DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxes DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cod',
    ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'placed',
    ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
    ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_delivery_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS customer_rating INTEGER,
    ADD COLUMN IF NOT EXISTS customer_review TEXT,
    ADD COLUMN IF NOT EXISTS vendor_notes TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS refund_status TEXT,
    ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add columns to existing deal_redemptions table  
ALTER TABLE public.deal_redemptions
    ADD COLUMN IF NOT EXISTS vendor_id UUID,
    ADD COLUMN IF NOT EXISTS redemption_code TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'claimed',
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS amount_saved DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Create restaurant_details table
CREATE TABLE IF NOT EXISTS public.restaurant_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
    cuisine_types TEXT[] DEFAULT '{}',
    is_pure_veg BOOLEAN DEFAULT false,
    avg_delivery_time INTEGER DEFAULT 30,
    min_order_amount DECIMAL(10,2) DEFAULT 100,
    delivery_radius_km DECIMAL(5,2) DEFAULT 5,
    is_accepting_orders BOOLEAN DEFAULT true,
    opening_time TIME DEFAULT '09:00',
    closing_time TIME DEFAULT '22:00',
    fssai_license TEXT,
    packaging_charge DECIMAL(10,2) DEFAULT 0,
    delivery_charge DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(vendor_id)
);

-- Create menu_categories table
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    discounted_price DECIMAL(10,2),
    image_url TEXT,
    is_veg BOOLEAN DEFAULT true,
    is_bestseller BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    preparation_time INTEGER DEFAULT 15,
    calories INTEGER,
    serves INTEGER DEFAULT 1,
    spice_level INTEGER DEFAULT 1,
    allergens TEXT[],
    customizations JSONB DEFAULT '[]',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create deal_merchant_details table
CREATE TABLE IF NOT EXISTS public.deal_merchant_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
    business_category TEXT,
    website_url TEXT,
    social_media JSONB DEFAULT '{}',
    terms_accepted BOOLEAN DEFAULT false,
    max_active_deals INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(vendor_id)
);

-- Create merchant_deals table
CREATE TABLE IF NOT EXISTS public.merchant_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    original_price DECIMAL(10,2) NOT NULL,
    deal_price DECIMAL(10,2) NOT NULL,
    discount_percent INTEGER,
    image_url TEXT,
    category TEXT,
    terms_conditions TEXT,
    max_redemptions INTEGER,
    current_redemptions INTEGER DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    valid_from TIMESTAMPTZ DEFAULT now(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    redemption_type TEXT DEFAULT 'in_store',
    coupon_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create vendor_settlements table
CREATE TABLE IF NOT EXISTS public.vendor_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_amount DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    net_amount DECIMAL(12,2) NOT NULL,
    order_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    payment_reference TEXT,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vendor_notifications table
CREATE TABLE IF NOT EXISTS public.vendor_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_merchant_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
CREATE POLICY "Vendors can view own profile" ON public.vendors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Vendors can update own profile" ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Vendors can insert own profile" ON public.vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can view active verified vendors" ON public.vendors FOR SELECT USING (is_verified = true AND is_active = true);

-- RLS for restaurant_details
CREATE POLICY "Vendors can manage own restaurant details" ON public.restaurant_details FOR ALL USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE POLICY "Public can view restaurant details" ON public.restaurant_details FOR SELECT USING (true);

-- RLS for menu_categories
CREATE POLICY "Vendors can manage own menu categories" ON public.menu_categories FOR ALL USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE POLICY "Public can view menu categories" ON public.menu_categories FOR SELECT USING (true);

-- RLS for menu_items
CREATE POLICY "Vendors can manage own menu items" ON public.menu_items FOR ALL USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE POLICY "Public can view available menu items" ON public.menu_items FOR SELECT USING (is_available = true);

-- RLS for deal_merchant_details
CREATE POLICY "Vendors can manage own deal merchant details" ON public.deal_merchant_details FOR ALL USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- RLS for merchant_deals
CREATE POLICY "Vendors can manage own deals" ON public.merchant_deals FOR ALL USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE POLICY "Public can view active deals" ON public.merchant_deals FOR SELECT USING (is_active = true);

-- RLS for vendor_settlements
CREATE POLICY "Vendors can view own settlements" ON public.vendor_settlements FOR SELECT USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- RLS for vendor_notifications
CREATE POLICY "Vendors can view own notifications" ON public.vendor_notifications FOR SELECT USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE POLICY "Vendors can update own notifications" ON public.vendor_notifications FOR UPDATE USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));