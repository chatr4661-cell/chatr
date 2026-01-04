-- Fix function search path for security
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.order_number := 'CHH' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_medicine_streak()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
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