-- Chatr Studio - Marketing Design System

-- Design templates library
CREATE TABLE public.studio_design_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'product', 'service', 'menu', 'offer', 'social', 'flyer'
  thumbnail_url TEXT,
  template_data JSONB NOT NULL DEFAULT '{}', -- Contains placeholders, layout, styles
  dimensions JSONB DEFAULT '{"width": 1080, "height": 1080}',
  is_premium BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User's saved designs
CREATE TABLE public.studio_user_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id UUID REFERENCES public.studio_design_templates(id),
  name TEXT NOT NULL,
  design_data JSONB NOT NULL DEFAULT '{}', -- User's customized data
  thumbnail_url TEXT,
  exported_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.studio_design_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_user_designs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view templates" ON public.studio_design_templates
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their designs" ON public.studio_user_designs
  FOR ALL USING (auth.uid() = user_id);

-- Seed templates
INSERT INTO public.studio_design_templates (name, category, template_data, dimensions) VALUES
-- Product Showcase
('Product Spotlight', 'product', '{"background": "#ffffff", "elements": [{"type": "image", "placeholder": "product_image", "x": 50, "y": 50, "width": 400, "height": 400}, {"type": "text", "placeholder": "product_name", "x": 50, "y": 480, "fontSize": 32, "fontWeight": "bold", "color": "#1a1a1a"}, {"type": "text", "placeholder": "price", "x": 50, "y": 530, "fontSize": 28, "color": "#16a34a"}, {"type": "text", "placeholder": "description", "x": 50, "y": 580, "fontSize": 16, "color": "#666666"}]}', '{"width": 1080, "height": 1080}'),
('Product Grid', 'product', '{"background": "#f5f5f5", "elements": [{"type": "text", "placeholder": "headline", "x": 50, "y": 50, "fontSize": 36, "fontWeight": "bold"}, {"type": "image", "placeholder": "product1", "x": 50, "y": 120, "width": 300, "height": 300}, {"type": "image", "placeholder": "product2", "x": 380, "y": 120, "width": 300, "height": 300}, {"type": "text", "placeholder": "cta", "x": 50, "y": 900, "fontSize": 24, "color": "#ffffff", "background": "#3b82f6"}]}', '{"width": 1080, "height": 1080}'),

-- Service Menu
('Service Price List', 'service', '{"background": "#1a1a1a", "elements": [{"type": "text", "placeholder": "business_name", "x": 50, "y": 50, "fontSize": 40, "fontWeight": "bold", "color": "#ffffff"}, {"type": "text", "placeholder": "service1", "x": 50, "y": 150, "fontSize": 24, "color": "#ffffff"}, {"type": "text", "placeholder": "price1", "x": 400, "y": 150, "fontSize": 24, "color": "#22c55e"}, {"type": "text", "placeholder": "service2", "x": 50, "y": 200, "fontSize": 24, "color": "#ffffff"}, {"type": "text", "placeholder": "price2", "x": 400, "y": 200, "fontSize": 24, "color": "#22c55e"}]}', '{"width": 1080, "height": 1350}'),
('Service Card', 'service', '{"background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", "elements": [{"type": "text", "placeholder": "service_name", "x": 50, "y": 100, "fontSize": 48, "fontWeight": "bold", "color": "#ffffff"}, {"type": "text", "placeholder": "description", "x": 50, "y": 180, "fontSize": 20, "color": "#ffffff"}, {"type": "text", "placeholder": "price", "x": 50, "y": 300, "fontSize": 64, "fontWeight": "bold", "color": "#ffffff"}, {"type": "text", "placeholder": "cta", "x": 50, "y": 400, "fontSize": 24, "color": "#ffffff"}]}', '{"width": 1080, "height": 1080}'),

-- Offers/Deals
('Sale Banner', 'offer', '{"background": "#ef4444", "elements": [{"type": "text", "placeholder": "discount", "x": 50, "y": 100, "fontSize": 120, "fontWeight": "bold", "color": "#ffffff"}, {"type": "text", "placeholder": "offer_text", "x": 50, "y": 280, "fontSize": 36, "color": "#ffffff"}, {"type": "text", "placeholder": "validity", "x": 50, "y": 350, "fontSize": 20, "color": "#fecaca"}]}', '{"width": 1080, "height": 1080}'),
('Flash Sale', 'offer', '{"background": "#fbbf24", "elements": [{"type": "text", "value": "⚡ FLASH SALE", "x": 50, "y": 50, "fontSize": 48, "fontWeight": "bold", "color": "#1a1a1a"}, {"type": "text", "placeholder": "discount", "x": 50, "y": 150, "fontSize": 96, "fontWeight": "bold", "color": "#dc2626"}, {"type": "text", "placeholder": "products", "x": 50, "y": 300, "fontSize": 24, "color": "#1a1a1a"}]}', '{"width": 1080, "height": 1080}'),

-- Social Media Posts
('Instagram Post', 'social', '{"background": "#ffffff", "elements": [{"type": "image", "placeholder": "main_image", "x": 0, "y": 0, "width": 1080, "height": 800}, {"type": "text", "placeholder": "caption", "x": 50, "y": 850, "fontSize": 28, "color": "#1a1a1a"}, {"type": "text", "placeholder": "hashtags", "x": 50, "y": 920, "fontSize": 18, "color": "#3b82f6"}]}', '{"width": 1080, "height": 1080}'),
('WhatsApp Status', 'social', '{"background": "linear-gradient(180deg, #25d366 0%, #128c7e 100%)", "elements": [{"type": "text", "placeholder": "message", "x": 50, "y": 300, "fontSize": 36, "fontWeight": "bold", "color": "#ffffff", "textAlign": "center"}, {"type": "text", "placeholder": "cta", "x": 50, "y": 500, "fontSize": 24, "color": "#ffffff"}]}', '{"width": 1080, "height": 1920}'),

-- Menu/Price Lists
('Restaurant Menu', 'menu', '{"background": "#faf5f0", "elements": [{"type": "text", "placeholder": "restaurant_name", "x": 50, "y": 50, "fontSize": 48, "fontWeight": "bold", "color": "#78350f"}, {"type": "text", "placeholder": "item1", "x": 50, "y": 150, "fontSize": 24, "color": "#1a1a1a"}, {"type": "text", "placeholder": "price1", "x": 400, "y": 150, "fontSize": 24, "color": "#78350f"}, {"type": "text", "placeholder": "item2", "x": 50, "y": 200, "fontSize": 24, "color": "#1a1a1a"}, {"type": "text", "placeholder": "price2", "x": 400, "y": 200, "fontSize": 24, "color": "#78350f"}]}', '{"width": 1080, "height": 1350}'),
('Cafe Menu', 'menu', '{"background": "#1a1a1a", "elements": [{"type": "text", "value": "☕ MENU", "x": 50, "y": 50, "fontSize": 56, "fontWeight": "bold", "color": "#d4a574"}, {"type": "text", "placeholder": "item1", "x": 50, "y": 150, "fontSize": 24, "color": "#ffffff"}, {"type": "text", "placeholder": "price1", "x": 400, "y": 150, "fontSize": 24, "color": "#d4a574"}]}', '{"width": 1080, "height": 1350}'),

-- Flyers
('Event Flyer', 'flyer', '{"background": "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", "elements": [{"type": "text", "placeholder": "event_name", "x": 50, "y": 100, "fontSize": 56, "fontWeight": "bold", "color": "#ffffff"}, {"type": "text", "placeholder": "date", "x": 50, "y": 200, "fontSize": 32, "color": "#fbbf24"}, {"type": "text", "placeholder": "venue", "x": 50, "y": 260, "fontSize": 24, "color": "#94a3b8"}, {"type": "text", "placeholder": "details", "x": 50, "y": 350, "fontSize": 18, "color": "#ffffff"}]}', '{"width": 1080, "height": 1350}'),
('Business Flyer', 'flyer', '{"background": "#ffffff", "elements": [{"type": "image", "placeholder": "logo", "x": 50, "y": 50, "width": 150, "height": 150}, {"type": "text", "placeholder": "business_name", "x": 220, "y": 80, "fontSize": 36, "fontWeight": "bold", "color": "#1a1a1a"}, {"type": "text", "placeholder": "tagline", "x": 220, "y": 130, "fontSize": 18, "color": "#666666"}, {"type": "text", "placeholder": "services", "x": 50, "y": 250, "fontSize": 20, "color": "#1a1a1a"}, {"type": "text", "placeholder": "contact", "x": 50, "y": 500, "fontSize": 18, "color": "#3b82f6"}]}', '{"width": 1080, "height": 1350}');

-- Trigger for updated_at
CREATE TRIGGER update_studio_user_designs_updated_at
  BEFORE UPDATE ON public.studio_user_designs
  FOR EACH ROW EXECUTE FUNCTION update_stealth_mode_updated_at();