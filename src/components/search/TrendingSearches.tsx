import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

interface TrendingSearch {
  query: string;
  search_count: number;
  category: string | null;
}

export const TrendingSearches = ({ onSearchClick }: { onSearchClick: (query: string) => void }) => {
  const [trending, setTrending] = useState<TrendingSearch[]>([]);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    const { data } = await supabase
      .from('trending_searches')
      .select('query, search_count, category')
      .order('search_count', { ascending: false })
      .limit(10);

    if (data) setTrending(data);
  };

  if (trending.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Trending Searches</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {trending.map((item) => (
          <Badge
            key={item.query}
            variant="secondary"
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => onSearchClick(item.query)}
          >
            {item.query}
            <span className="ml-1 text-xs opacity-70">({item.search_count})</span>
          </Badge>
        ))}
      </div>
    </div>
  );
};
