-- =============================================
-- CHATR HEALTH: MEDICINE SUBSCRIPTION SYSTEM
-- =============================================

-- Health Conditions Master Table
CREATE TABLE public.health_conditions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_hindi TEXT,
    category TEXT NOT NULL DEFAULT 'chronic',
    icon TEXT,
    description TEXT,
    tracking_metrics JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Health Profiles (extends existing profiles)
CREATE TABLE public.user_health_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conditions TEXT[] DEFAULT '{}',
    date_of_birth DATE,
    gender TEXT,
    blood_group TEXT,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    preferred_language TEXT DEFAULT 'en',
    reminder_preferences JSONB DEFAULT '{"morning": "08:00", "afternoon": "14:00", "evening": "20:00", "night": "22:00"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Family Members Management
CREATE TABLE public.health_family_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    caregiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    member_phone TEXT,
    relationship TEXT NOT NULL,
    date_of_birth DATE,
    conditions TEXT[] DEFAULT '{}',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    alert_on_missed_dose BOOLEAN DEFAULT true,
    alert_on_abnormal_vitals BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Medicine Master Catalog
CREATE TABLE public.medicine_catalog (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    generic_name TEXT,
    manufacturer TEXT,
    category TEXT,
    form TEXT, -- tablet, capsule, syrup, injection, inhaler
    strength TEXT,
    pack_size INTEGER,
    mrp NUMERIC NOT NULL,
    discounted_price NUMERIC,
    requires_prescription BOOLEAN DEFAULT true,
    for_conditions TEXT[] DEFAULT '{}',
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Prescription Uploads
CREATE TABLE public.prescription_uploads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES public.health_family_members(id),
    image_url TEXT NOT NULL,
    ocr_raw_text TEXT,
    ocr_parsed_data JSONB,
    doctor_name TEXT,
    hospital_name TEXT,
    prescription_date DATE,
    status TEXT DEFAULT 'pending', -- pending, processed, verified, rejected
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Medicine Subscriptions
CREATE TABLE public.medicine_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES public.health_family_members(id),
    subscription_name TEXT NOT NULL,
    plan_type TEXT DEFAULT 'care', -- lite, care, family, care_plus
    status TEXT DEFAULT 'active', -- active, paused, cancelled
    monthly_cost NUMERIC DEFAULT 0,
    savings_amount NUMERIC DEFAULT 0,
    next_delivery_date DATE,
    delivery_address JSONB,
    payment_method TEXT,
    auto_refill BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Subscription Items (medicines in a subscription)
CREATE TABLE public.subscription_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES public.medicine_subscriptions(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES public.medicine_catalog(id),
    medicine_name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT, -- once_daily, twice_daily, thrice_daily, as_needed
    timing TEXT[] DEFAULT '{}', -- morning, afternoon, evening, night, before_food, after_food
    quantity_per_month INTEGER DEFAULT 30,
    unit_price NUMERIC,
    total_price NUMERIC,
    is_generic BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Medicine Reminders
CREATE TABLE public.medicine_reminders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES public.health_family_members(id),
    subscription_item_id UUID REFERENCES public.subscription_items(id),
    medicine_name TEXT NOT NULL,
    scheduled_time TIME NOT NULL,
    days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sunday
    reminder_type TEXT DEFAULT 'push', -- push, whatsapp, sms
    is_active BOOLEAN DEFAULT true,
    snooze_minutes INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Medicine Intake Log (for tracking adherence)
CREATE TABLE public.medicine_intake_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES public.health_family_members(id),
    subscription_item_id UUID REFERENCES public.subscription_items(id),
    medicine_name TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    taken_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending', -- pending, taken, missed, skipped
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vitals Readings (enhanced for chronic conditions)
CREATE TABLE public.chronic_vitals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES public.health_family_members(id),
    vital_type TEXT NOT NULL, -- blood_sugar_fasting, blood_sugar_pp, bp_systolic, bp_diastolic, weight, tsh, cholesterol_total, cholesterol_ldl, cholesterol_hdl
    value NUMERIC NOT NULL,
    unit TEXT,
    reading_time TEXT, -- fasting, post_meal, random
    notes TEXT,
    source TEXT DEFAULT 'manual', -- manual, device, lab_report
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Health Streaks (gamification)
CREATE TABLE public.health_streaks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES public.health_family_members(id),
    streak_type TEXT NOT NULL, -- medicine_adherence, vitals_tracking, daily_login
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    coins_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, family_member_id, streak_type)
);

-- Caregiver Alerts
CREATE TABLE public.caregiver_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    caregiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_member_id UUID NOT NULL REFERENCES public.health_family_members(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL, -- missed_dose, abnormal_vital, refill_due, emergency
    severity TEXT DEFAULT 'medium', -- low, medium, high, critical
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    is_actioned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Delivery Orders
CREATE TABLE public.medicine_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.medicine_subscriptions(id),
    order_number TEXT UNIQUE,
    items JSONB NOT NULL,
    subtotal NUMERIC NOT NULL,
    discount NUMERIC DEFAULT 0,
    delivery_fee NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, confirmed, shipped, delivered, cancelled
    delivery_address JSONB,
    expected_delivery DATE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.health_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_intake_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chronic_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Health Conditions (public read)
CREATE POLICY "Anyone can view health conditions" ON public.health_conditions FOR SELECT USING (true);

-- Medicine Catalog (public read)
CREATE POLICY "Anyone can view medicine catalog" ON public.medicine_catalog FOR SELECT USING (true);

-- User Health Profiles
CREATE POLICY "Users can manage own health profile" ON public.user_health_profiles FOR ALL USING (auth.uid() = user_id);

-- Family Members
CREATE POLICY "Users can manage own family members" ON public.health_family_members FOR ALL USING (auth.uid() = caregiver_user_id);

-- Prescription Uploads
CREATE POLICY "Users can manage own prescriptions" ON public.prescription_uploads FOR ALL USING (auth.uid() = user_id);

-- Medicine Subscriptions
CREATE POLICY "Users can manage own subscriptions" ON public.medicine_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Subscription Items
CREATE POLICY "Users can manage own subscription items" ON public.subscription_items FOR ALL 
USING (EXISTS (SELECT 1 FROM public.medicine_subscriptions ms WHERE ms.id = subscription_id AND ms.user_id = auth.uid()));

-- Medicine Reminders
CREATE POLICY "Users can manage own reminders" ON public.medicine_reminders FOR ALL USING (auth.uid() = user_id);

-- Medicine Intake Log
CREATE POLICY "Users can manage own intake log" ON public.medicine_intake_log FOR ALL USING (auth.uid() = user_id);

-- Chronic Vitals
CREATE POLICY "Users can manage own vitals" ON public.chronic_vitals FOR ALL USING (auth.uid() = user_id);

-- Health Streaks
CREATE POLICY "Users can manage own streaks" ON public.health_streaks FOR ALL USING (auth.uid() = user_id);

-- Caregiver Alerts
CREATE POLICY "Caregivers can manage own alerts" ON public.caregiver_alerts FOR ALL USING (auth.uid() = caregiver_user_id);

-- Medicine Orders
CREATE POLICY "Users can manage own orders" ON public.medicine_orders FOR ALL USING (auth.uid() = user_id);

-- Insert default health conditions
INSERT INTO public.health_conditions (name, name_hindi, category, icon, description) VALUES
('Diabetes Type 2', 'मधुमेह टाइप 2', 'chronic', 'droplet', 'High blood sugar levels requiring daily management'),
('Hypertension', 'उच्च रक्तचाप', 'chronic', 'heart-pulse', 'High blood pressure requiring regular monitoring'),
('Hypothyroidism', 'हाइपोथायरायडिज्म', 'chronic', 'activity', 'Underactive thyroid requiring daily medication'),
('Hyperthyroidism', 'हाइपरथायरायडिज्म', 'chronic', 'activity', 'Overactive thyroid requiring treatment'),
('High Cholesterol', 'उच्च कोलेस्ट्रॉल', 'chronic', 'heart', 'Elevated lipid levels requiring management'),
('Asthma', 'दमा', 'chronic', 'wind', 'Respiratory condition requiring inhaler use'),
('COPD', 'सीओपीडी', 'chronic', 'wind', 'Chronic lung disease requiring ongoing care'),
('Arthritis', 'गठिया', 'chronic', 'bone', 'Joint inflammation requiring pain management'),
('Cardiac Care', 'हृदय देखभाल', 'chronic', 'heart', 'Post-cardiac event care and prevention');

-- Create indexes for performance
CREATE INDEX idx_user_health_profiles_user ON public.user_health_profiles(user_id);
CREATE INDEX idx_family_members_caregiver ON public.health_family_members(caregiver_user_id);
CREATE INDEX idx_prescriptions_user ON public.prescription_uploads(user_id);
CREATE INDEX idx_subscriptions_user ON public.medicine_subscriptions(user_id);
CREATE INDEX idx_subscription_items_subscription ON public.subscription_items(subscription_id);
CREATE INDEX idx_reminders_user ON public.medicine_reminders(user_id);
CREATE INDEX idx_intake_log_user ON public.medicine_intake_log(user_id);
CREATE INDEX idx_intake_log_scheduled ON public.medicine_intake_log(scheduled_at);
CREATE INDEX idx_vitals_user ON public.chronic_vitals(user_id);
CREATE INDEX idx_vitals_recorded ON public.chronic_vitals(recorded_at);
CREATE INDEX idx_streaks_user ON public.health_streaks(user_id);
CREATE INDEX idx_alerts_caregiver ON public.caregiver_alerts(caregiver_user_id);
CREATE INDEX idx_orders_user ON public.medicine_orders(user_id);

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := 'CHH' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
    BEFORE INSERT ON public.medicine_orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- Function to update streak on medicine intake
CREATE OR REPLACE FUNCTION update_medicine_streak()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'taken' THEN
        INSERT INTO public.health_streaks (user_id, family_member_id, streak_type, current_streak, longest_streak, last_activity_date, coins_earned)
        VALUES (NEW.user_id, NEW.family_member_id, 'medicine_adherence', 1, 1, CURRENT_DATE, 5)
        ON CONFLICT (user_id, family_member_id, streak_type)
        DO UPDATE SET
            current_streak = CASE 
                WHEN health_streaks.last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN health_streaks.current_streak + 1
                WHEN health_streaks.last_activity_date = CURRENT_DATE THEN health_streaks.current_streak
                ELSE 1
            END,
            longest_streak = GREATEST(health_streaks.longest_streak, 
                CASE 
                    WHEN health_streaks.last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN health_streaks.current_streak + 1
                    ELSE 1
                END
            ),
            last_activity_date = CURRENT_DATE,
            coins_earned = health_streaks.coins_earned + 5,
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_streak
    AFTER INSERT OR UPDATE ON public.medicine_intake_log
    FOR EACH ROW
    EXECUTE FUNCTION update_medicine_streak();