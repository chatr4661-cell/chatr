-- Create review replies table for sellers to respond to reviews
CREATE TABLE IF NOT EXISTS public.review_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.home_service_reviews(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

-- Sellers can create replies to reviews for their services
CREATE POLICY "Sellers can create review replies"
ON public.review_replies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.home_service_reviews hr
    JOIN public.home_service_providers hsp ON hr.provider_id = hsp.id
    WHERE hr.id = review_replies.review_id
    AND hsp.user_id = auth.uid()
  )
);

-- Anyone can view review replies
CREATE POLICY "Anyone can view review replies"
ON public.review_replies
FOR SELECT
USING (true);

-- Sellers can update their own replies
CREATE POLICY "Sellers can update their replies"
ON public.review_replies
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.home_service_reviews hr
    JOIN public.home_service_providers hsp ON hr.provider_id = hsp.id
    WHERE hr.id = review_replies.review_id
    AND hsp.user_id = auth.uid()
  )
);

-- Create reported reviews table
CREATE TABLE IF NOT EXISTS public.reported_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.home_service_reviews(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.reported_reviews ENABLE ROW LEVEL SECURITY;

-- Sellers can report reviews
CREATE POLICY "Sellers can report reviews"
ON public.reported_reviews
FOR INSERT
WITH CHECK (auth.uid() = reported_by);

-- Sellers can view their reports
CREATE POLICY "Sellers can view their reports"
ON public.reported_reviews
FOR SELECT
USING (auth.uid() = reported_by);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_review_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_replies_updated_at
BEFORE UPDATE ON public.review_replies
FOR EACH ROW
EXECUTE FUNCTION update_review_replies_updated_at();