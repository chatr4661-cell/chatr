import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { chatrLocalSearch, ChatrResult } from '@/lib/chatrClient';
import { CategoryCard } from '@/components/search/CategoryCard';

export default function FoodOrdering() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<ChatrResult[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<ChatrResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { location, loading: locationLoading } = useChatrLocation();

  useEffect(() => {
    if (location?.lat && location?.lon) {
      loadVendors();
    }
  }, [location?.lat, location?.lon]);

  useEffect(() => {
    filterVendors();
  }, [vendors, searchQuery]);

  const loadVendors = async () => {
    if (!location?.lat || !location?.lon) return;
    
    setLoading(true);
    try {
      const results = await chatrLocalSearch('restaurant food delivery dining', location.lat, location.lon);
      
      if (results && results.length > 0) {
        setVendors(results);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load restaurants',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterVendors = () => {
    let filtered = [...vendors];

    if (searchQuery) {
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredVendors(filtered);
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleDirections = (lat?: number, lon?: number) => {
    if (lat && lon) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
    }
  };

  const handleBook = () => {
    toast({
      title: 'Order',
      description: 'Opening order interface...',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-500/5 to-background pb-20">
      <div className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 max-w-6xl flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Food Ordering</h1>
            <p className="text-xs text-muted-foreground">Order from local restaurants</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Near You</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        {locationLoading || loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Finding restaurants...</p>
          </div>
        ) : !location ? (
          <div className="text-center py-12 space-y-3">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Enable location to find restaurants near you</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-lg font-semibold text-foreground">No restaurants available</p>
            <p className="text-sm text-muted-foreground">Check back soon for delicious food options!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredVendors.map((vendor) => (
              <CategoryCard
                key={vendor.id}
                result={vendor}
                onCall={handleCall}
                onDirections={handleDirections}
                onBook={handleBook}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
