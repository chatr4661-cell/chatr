import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Heart, Star, MapPin, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FavoriteResult {
  id: string;
  result_id: string;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  search_results: {
    title: string;
    description: string;
    price: string;
    rating: number;
    address: string;
    image_url: string;
    source: string;
    result_type: string;
  };
}

export const FavoriteResults = ({ onResultClick }: { onResultClick: (result: any) => void }) => {
  const [favorites, setFavorites] = useState<FavoriteResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorite_results')
        .select('*, search_results(*)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('favorite_results')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFavorites(prev => prev.filter(f => f.id !== id));
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove favorite');
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading favorites...</div>;
  }

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Heart className="w-4 h-4 fill-current text-red-500" />
        Favorite Results
      </h3>
      <div className="space-y-3">
        {favorites.map((favorite) => (
          <Card key={favorite.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex gap-3">
              {favorite.search_results.image_url && (
                <img
                  src={favorite.search_results.image_url}
                  alt={favorite.search_results.title}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <button
                    onClick={() => onResultClick(favorite.search_results)}
                    className="font-semibold text-sm hover:text-primary transition-colors truncate"
                  >
                    {favorite.search_results.title}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => removeFavorite(favorite.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {favorite.search_results.result_type}
                  </Badge>
                  {favorite.search_results.rating > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{favorite.search_results.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {favorite.search_results.price && (
                    <span className="text-xs font-medium text-primary">
                      {favorite.search_results.price}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {favorite.search_results.description}
                </p>

                {favorite.search_results.address && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{favorite.search_results.address}</span>
                  </div>
                )}

                {favorite.tags && favorite.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {favorite.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  Saved {formatDistanceToNow(new Date(favorite.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
