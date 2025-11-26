import { useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGeoLocation } from '@/hooks/useGeoLocation';

interface GeoSearchBarProps {
  onSearch: (query: string, category: string) => void;
  isSearching?: boolean;
}

const categories = [
  { id: 'hospitals', label: 'Hospitals', icon: '🏥' },
  { id: 'clinics', label: 'Clinics', icon: '⚕️' },
  { id: 'pharmacies', label: 'Pharmacies', icon: '💊' },
  { id: 'labs', label: 'Labs', icon: '🔬' },
  { id: 'jobs', label: 'Jobs', icon: '💼' },
  { id: 'restaurants', label: 'Food', icon: '🍽️' },
  { id: 'grocery', label: 'Grocery', icon: '🛒' },
  { id: 'atms', label: 'ATMs', icon: '💰' },
  { id: 'petrol', label: 'Petrol', icon: '⛽' },
  { id: 'transport', label: 'Transport', icon: '🚌' },
];

export function GeoSearchBar({ onSearch, isSearching }: GeoSearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const { location, isLoading: locationLoading } = useGeoLocation();

  const handleSearch = () => {
    if (query.trim() || selectedCategory !== 'general') {
      onSearch(query.trim() || selectedCategory, selectedCategory);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    onSearch(categoryId, categoryId);
  };

  return (
    <div className="w-full space-y-4">
      {/* Location Status */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        {locationLoading ? (
          <span>Detecting location...</span>
        ) : location ? (
          <span>
            {location.city || 'Location detected'} • {location.method === 'gps' ? 'GPS' : location.method === 'ip' ? 'IP' : 'Manual'}
          </span>
        ) : (
          <span>Set location manually</span>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search any place, service, or job..."
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching || locationLoading}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full border whitespace-nowrap
              transition-colors duration-200
              ${selectedCategory === cat.id 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-background hover:bg-accent border-border'
              }
            `}
          >
            <span>{cat.icon}</span>
            <span className="text-sm font-medium">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
