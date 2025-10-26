import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface ARFilter {
  id: string;
  brand_id: string;
  filter_name: string;
  filter_description: string;
  filter_asset_url: string;
  preview_image_url: string;
  category: string;
  usage_count: number;
  brand_partnerships: {
    brand_name: string;
    brand_logo_url: string;
  };
}

interface ARBrandFiltersProps {
  onFilterSelect: (filter: ARFilter) => void;
  selectedFilterId?: string;
}

export default function ARBrandFilters({ onFilterSelect, selectedFilterId }: ARBrandFiltersProps) {
  const [filters, setFilters] = useState<ARFilter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const { data, error } = await supabase
        .from('ar_brand_filters')
        .select('*, brand_partnerships!inner(brand_name, brand_logo_url)')
        .eq('brand_partnerships.status', 'active')
        .order('is_featured', { ascending: false })
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setFilters(data || []);
    } catch (error) {
      console.error('Error loading AR filters:', error);
      toast.error('Failed to load AR filters');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterClick = async (filter: ARFilter) => {
    onFilterSelect(filter);

    // Track usage
    try {
      await supabase
        .from('ar_brand_filters')
        .update({ usage_count: filter.usage_count + 1 })
        .eq('id', filter.id);

      await supabase.rpc('track_brand_impression', {
        p_brand_id: filter.brand_id,
        p_placement_id: null,
        p_user_id: (await supabase.auth.getUser()).data.user?.id || null,
        p_impression_type: 'interaction',
        p_detected_object: 'ar_filter',
        p_duration: 0
      });
    } catch (error) {
      console.error('Error tracking filter usage:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Brand AR Filters</span>
      </div>
      
      <ScrollArea className="h-32">
        <div className="flex gap-2 p-3">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleFilterClick(filter)}
              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                selectedFilterId === filter.id
                  ? 'border-primary scale-105'
                  : 'border-transparent hover:border-primary/50'
              }`}
            >
              <div className="relative w-full h-full">
                <img
                  src={filter.preview_image_url || filter.filter_asset_url}
                  alt={filter.filter_name}
                  className="w-full h-full object-cover"
                />
                {filter.brand_partnerships.brand_logo_url && (
                  <img
                    src={filter.brand_partnerships.brand_logo_url}
                    alt={filter.brand_partnerships.brand_name}
                    className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-white/90 p-0.5"
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
