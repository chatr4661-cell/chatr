import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GeoSearchBar } from '@/components/geo/GeoSearchBar';
import { GeoResultCard } from '@/components/geo/GeoResultCard';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { Button } from '@/components/ui/button';
import { MapPin, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GeoResult {
  id: string;
  name: string;
  type: string;
  address: string;
  distance: number;
  rating?: number;
  phone?: string;
  isOpen?: boolean;
  latitude: number;
  longitude: number;
  source: string;
}

export default function GeoDiscovery() {
  const { location, isLoading: locationLoading, error: locationError, requestLocation } = useGeoLocation();
  const [results, setResults] = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (query: string, category: string) => {
    if (!location) {
      setSearchError('Location required. Please enable GPS or set location manually.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const { data, error } = await supabase.functions.invoke('geo-search', {
        body: {
          query,
          lat: location.latitude,
          lng: location.longitude,
          radius: 5,
          category
        }
      });

      if (error) throw error;

      if (data?.results) {
        setResults(data.results);
      } else {
        setResults([]);
        setSearchError('No results found. Try a different search or location.');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Geo Discovery</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={requestLocation}
              disabled={locationLoading}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Refresh Location
            </Button>
          </div>

          <GeoSearchBar onSearch={handleSearch} isSearching={isSearching} />
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto p-4">
        {/* Location Error */}
        {locationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{locationError}</AlertDescription>
          </Alert>
        )}

        {/* Search Error */}
        {searchError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{searchError}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </h2>
            </div>

            {results.map((result) => (
              <GeoResultCard key={result.id} result={result} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isSearching && results.length === 0 && !searchError && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Start Exploring</h3>
            <p className="text-muted-foreground">
              Search for places, services, or jobs near you
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
