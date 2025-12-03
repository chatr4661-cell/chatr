import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Briefcase, Utensils, Tag, Share2, FileText, Sparkles, Quote, Megaphone, CreditCard } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  thumbnail_url: string | null;
  template_data: any;
  dimensions: { width: number; height: number };
  is_premium: boolean;
}

interface TemplateGalleryProps {
  onSelect: (template: Template) => void;
}

const categories = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'product', label: 'Products', icon: Package },
  { id: 'service', label: 'Services', icon: Briefcase },
  { id: 'menu', label: 'Menu', icon: Utensils },
  { id: 'offer', label: 'Offers', icon: Tag },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'flyer', label: 'Flyers', icon: FileText },
  { id: 'quote', label: 'Quotes', icon: Quote },
  { id: 'announcement', label: 'Announce', icon: Megaphone },
  { id: 'business_card', label: 'Cards', icon: CreditCard },
];

export const TemplateGallery = ({ onSelect }: TemplateGalleryProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('studio_design_templates' as any)
      .select('*')
      .order('usage_count', { ascending: false });

    if (data) setTemplates(data as any);
    setLoading(false);
  };

  const filteredTemplates = activeCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === activeCategory);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      product: 'from-blue-500 to-cyan-500',
      service: 'from-purple-500 to-pink-500',
      menu: 'from-amber-500 to-orange-500',
      offer: 'from-red-500 to-rose-500',
      social: 'from-green-500 to-emerald-500',
      flyer: 'from-indigo-500 to-violet-500',
      quote: 'from-pink-500 to-fuchsia-500',
      announcement: 'from-yellow-500 to-amber-500',
      business_card: 'from-slate-600 to-zinc-700',
    };
    return colors[category] || 'from-gray-500 to-slate-500';
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      product: '📦',
      service: '💼',
      menu: '🍽️',
      offer: '🏷️',
      social: '📱',
      flyer: '📄',
      quote: '💬',
      announcement: '📢',
      business_card: '💳',
    };
    return emojis[category] || '✨';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="gap-1 text-xs">
              <cat.icon className="h-3 w-3" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card 
            key={template.id}
            className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden group"
            onClick={() => onSelect(template)}
          >
            <CardContent className="p-0">
              <div 
                className={`aspect-square bg-gradient-to-br ${getCategoryColor(template.category)} flex items-center justify-center relative`}
              >
                <div className="text-white/80 text-center p-4">
                  <div className="text-4xl mb-2">
                    {getCategoryEmoji(template.category)}
                  </div>
                  <p className="text-sm font-medium">{template.name}</p>
                </div>
                {template.is_premium && (
                  <Badge className="absolute top-2 right-2 bg-yellow-500">
                    Premium
                  </Badge>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-medium">Use Template</span>
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-sm truncate">{template.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{template.category}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No templates in this category yet
        </div>
      )}
    </div>
  );
};
