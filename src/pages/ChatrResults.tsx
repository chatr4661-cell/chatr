import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { chatrSearch, chatrLocalSearch, type ChatrResult } from '@/lib/chatrClient';
import { toast } from 'sonner';

export default function ChatrResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const { location } = useChatrLocation();
  
  const [results, setResults] = useState<ChatrResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;

    setLoading(true);
    setError(null);

    const searchFn = location
      ? chatrLocalSearch(query, location.lat, location.lon)
      : chatrSearch(query);

    searchFn
      .then(setResults)
      .catch((err) => {
        setError('Backend offline or no connection');
        toast.error('Failed to fetch results');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [query, location]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-4 px-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/chatr-home')}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Results for "{query}"</h1>
            <p className="text-sm opacity-90">
              {location ? '📍 Searching nearby' : '🌍 Global search'}
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Searching...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive font-medium mb-2">⚠️ {error}</p>
            <p className="text-muted-foreground text-sm">
              Make sure the backend is running at localhost:4300
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg font-medium mb-2">No results found</p>
            <p className="text-muted-foreground">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="bg-card rounded-lg p-4 border shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-bold mb-2">{result.name}</h3>
                
                {result.category && (
                  <div className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded mb-2">
                    {result.category}
                  </div>
                )}

                {result.rating && (
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{result.rating.toFixed(1)}</span>
                  </div>
                )}

                {result.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{result.address}</span>
                  </div>
                )}

                <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                  {result.city && <span>📍 {result.city}</span>}
                  {result.pincode && <span>PIN: {result.pincode}</span>}
                  {result.distance && (
                    <span className="font-medium text-primary">
                      {result.distance.toFixed(1)} km away
                    </span>
                  )}
                </div>

                {result.phone && (
                  <a
                    href={`tel:${result.phone}`}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {result.phone}
                  </a>
                )}
              </div>
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
