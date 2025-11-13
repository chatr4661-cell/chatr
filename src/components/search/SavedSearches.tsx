import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Bell, BellOff, Search, Trash2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SavedSearch {
  id: string;
  query: string;
  notification_enabled: boolean;
  notification_frequency: string;
  results_count: number;
  created_at: string;
  updated_at: string;
}

export const SavedSearches = ({ onSearchClick }: { onSearchClick: (query: string) => void }) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setSavedSearches(data);
    } catch (error) {
      console.error('Error loading saved searches:', error);
      toast.error('Failed to load saved searches');
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ notification_enabled: enabled })
        .eq('id', id);

      if (error) throw error;

      setSavedSearches(prev =>
        prev.map(s => s.id === id ? { ...s, notification_enabled: enabled } : s)
      );

      toast.success(enabled ? 'Notifications enabled' : 'Notifications disabled');
    } catch (error) {
      toast.error('Failed to update notifications');
    }
  };

  const deleteSavedSearch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSavedSearches(prev => prev.filter(s => s.id !== id));
      toast.success('Saved search deleted');
    } catch (error) {
      toast.error('Failed to delete saved search');
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading saved searches...</div>;
  }

  if (savedSearches.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Saved Searches
      </h3>
      <div className="space-y-2">
        {savedSearches.map((search) => (
          <Card key={search.id} className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => onSearchClick(search.query)}
                    className="font-medium text-sm hover:text-primary transition-colors truncate"
                  >
                    {search.query}
                  </button>
                  <Badge variant="secondary" className="text-xs">
                    {search.results_count} results
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Saved {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {search.notification_enabled ? (
                    <Bell className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <Switch
                    checked={search.notification_enabled}
                    onCheckedChange={(checked) => toggleNotifications(search.id, checked)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => deleteSavedSearch(search.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
