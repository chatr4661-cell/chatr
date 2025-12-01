import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { chatrCategories, type ChatrCategory } from '@/lib/chatrClient';
import { toast } from 'sonner';

export default function ChatrHome() {
  const navigate = useNavigate();
  const { location, loading: locationLoading } = useChatrLocation();
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<ChatrCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    chatrCategories()
      .then(setCategories)
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoadingCategories(false));
  }, []);

  const handleSearch = () => {
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }
    navigate(`/chatr-results?q=${encodeURIComponent(query)}`);
  };

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/chatr-results?q=${encodeURIComponent(categoryName)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">CHATR Search</h1>
          <div className="flex items-center gap-2 text-sm opacity-90">
            <MapPin className="h-4 w-4" />
            {locationLoading ? (
              <span>Detecting location...</span>
            ) : location ? (
              <span>📍 Location detected</span>
            ) : (
              <span>No location (using global search)</span>
            )}
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto px-4 -mt-6">
        <div className="bg-card rounded-lg shadow-lg p-6 border">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for places, services, or anything..."
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} size="lg">
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Browse Categories</h2>
        {loadingCategories ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.slice(0, 10).map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.name)}
                className="bg-card hover:bg-accent rounded-lg p-4 border transition-colors text-center"
              >
                <div className="text-3xl mb-2">{category.icon || '📁'}</div>
                <div className="text-sm font-medium">{category.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-sm text-muted-foreground">
        Powered by <span className="font-bold text-primary">CHATR</span>
      </div>
    </div>
  );
}
