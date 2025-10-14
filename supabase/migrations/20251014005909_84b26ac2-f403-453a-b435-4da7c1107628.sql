-- Create tutors table
CREATE TABLE IF NOT EXISTS public.tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  subjects JSONB DEFAULT '[]'::jsonb,
  hourly_rate DECIMAL(10,2),
  rating_average DECIMAL(3,2) DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  years_experience INTEGER,
  education TEXT,
  languages JSONB DEFAULT '["English"]'::jsonb,
  availability JSONB DEFAULT '{}'::jsonb,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tutor sessions/bookings table
CREATE TABLE IF NOT EXISTS public.tutor_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES public.tutors(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  session_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  meeting_link TEXT,
  notes TEXT,
  student_rating INTEGER CHECK (student_rating >= 1 AND student_rating <= 5),
  student_feedback TEXT,
  amount_paid DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tutor reviews table
CREATE TABLE IF NOT EXISTS public.tutor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES public.tutors(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.tutor_bookings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_reviews ENABLE ROW LEVEL SECURITY;

-- Tutors policies
CREATE POLICY "Anyone can view active tutors"
  ON public.tutors FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create their tutor profile"
  ON public.tutors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tutors can update their own profile"
  ON public.tutors FOR UPDATE
  USING (auth.uid() = user_id);

-- Bookings policies
CREATE POLICY "Students can view their bookings"
  ON public.tutor_bookings FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() IN (SELECT user_id FROM tutors WHERE id = tutor_id));

CREATE POLICY "Students can create bookings"
  ON public.tutor_bookings FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students and tutors can update bookings"
  ON public.tutor_bookings FOR UPDATE
  USING (auth.uid() = student_id OR auth.uid() IN (SELECT user_id FROM tutors WHERE id = tutor_id));

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
  ON public.tutor_reviews FOR SELECT
  USING (true);

CREATE POLICY "Students can create reviews"
  ON public.tutor_reviews FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Function to update tutor rating
CREATE OR REPLACE FUNCTION update_tutor_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tutors 
  SET rating_average = (
    SELECT AVG(rating) FROM tutor_reviews WHERE tutor_id = NEW.tutor_id
  )
  WHERE id = NEW.tutor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_tutor_rating_trigger
AFTER INSERT ON tutor_reviews
FOR EACH ROW EXECUTE FUNCTION update_tutor_rating();

-- Insert sample tutors
INSERT INTO public.tutors (full_name, avatar_url, bio, subjects, hourly_rate, rating_average, total_sessions, years_experience, education, is_verified)
VALUES 
  ('Dr. Sarah Johnson', '👩‍🏫', 'Expert in Mathematics and Physics with 10+ years of teaching experience. Specialized in helping students excel in STEM subjects.', 
   '["Mathematics", "Physics", "Calculus", "Algebra"]'::jsonb, 45.00, 4.9, 250, 10, 'PhD in Mathematics - MIT', true),
  
  ('Prof. Michael Chen', '👨‍💼', 'Professional Business and Economics tutor. Former investment banker, now helping students understand finance and business strategy.', 
   '["Business", "Economics", "Finance", "Accounting"]'::jsonb, 50.00, 4.8, 180, 8, 'MBA - Harvard Business School', true),
  
  ('Emily Rodriguez', '👩‍💻', 'Passionate coding instructor specializing in Python, JavaScript, and Web Development. Making programming fun and accessible!', 
   '["Programming", "Python", "JavaScript", "Web Development"]'::jsonb, 40.00, 5.0, 320, 6, 'BS Computer Science - Stanford', true),
  
  ('David Kumar', '👨‍🔬', 'Chemistry and Biology expert with a knack for simplifying complex concepts. Preparing students for medical school and AP exams.', 
   '["Chemistry", "Biology", "Organic Chemistry", "Biochemistry"]'::jsonb, 42.00, 4.7, 195, 12, 'PhD Chemistry - Oxford', true),
  
  ('Lisa Thompson', '👩‍🎨', 'Creative writing and literature specialist. Published author helping students find their voice and improve their writing skills.', 
   '["English", "Creative Writing", "Literature", "Essay Writing"]'::jsonb, 38.00, 4.9, 210, 7, 'MFA Creative Writing - Iowa', true),
  
  ('James Park', '👨‍🏫', 'Spanish and French language tutor with native fluency. Interactive lessons focused on conversation and cultural immersion.', 
   '["Spanish", "French", "Language Arts"]'::jsonb, 35.00, 4.8, 165, 5, 'BA Linguistics - Berkeley', true);

-- Insert Chatr Tutors into mini_apps
INSERT INTO public.mini_apps (
  app_name,
  description,
  icon_url,
  app_url,
  category_id,
  rating_average,
  install_count,
  is_verified,
  is_active,
  tags
) VALUES (
  'Chatr Tutors',
  'Find expert tutors for any subject. Book 1-on-1 sessions with verified educators and excel in your studies.',
  '👨‍🎓',
  '/chatr-tutors',
  (SELECT id FROM app_categories WHERE name = 'Education' LIMIT 1),
  4.9,
  1250,
  true,
  true,
  ARRAY['education', 'tutoring', 'learning', 'academic']
) ON CONFLICT DO NOTHING;