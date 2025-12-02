import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { chatrLocalSearch, ChatrResult } from '@/lib/chatrClient';
import { CategoryCard } from '@/components/search/CategoryCard';

export default function LocalHealthcare() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listings, setListings] = useState<ChatrResult[]>([]);
  const [filteredListings, setFilteredListings] = useState<ChatrResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(10);
  const { location, loading: locationLoading } = useChatrLocation();

  useEffect(() => {
    if (location?.lat && location?.lon) {
      fetchHealthcare(location.lat, location.lon);
    }
  }, [location?.lat, location?.lon, radius]);

  useEffect(() => {
    filterListings();
  }, [listings, selectedType, searchQuery]);

  const fetchHealthcare = async (latitude: number, longitude: number) => {
    setLoading(true);
    try {
      const results = await chatrLocalSearch('healthcare doctors hospitals clinics', latitude, longitude);
      
      if (results && results.length > 0) {
        const filtered = results.filter(r => !r.distance || r.distance <= radius);
        setListings(filtered);
        toast({
          title: 'Success',
          description: `Found ${filtered.length} providers within ${radius}km`
        });
      } else {
        setListings([]);
      }
    } catch (error) {
      console.error('Error loading healthcare:', error);
      toast({
        title: 'Error',
        description: 'Failed to load healthcare providers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = [...listings];

    if (selectedType !== 'all') {
      filtered = filtered.filter(l => 
        l.category?.toLowerCase().includes(selectedType) ||
        l.detectedType?.toLowerCase().includes(selectedType)
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredListings(filtered);
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleDirections = (lat?: number, lon?: number) => {
    if (lat && lon) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Healthcare Near You</h1>
          <p className="text-muted-foreground">Find doctors, hospitals & clinics nearby</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search for doctors, hospitals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[160px] rounded-full">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="doctor">Doctors</SelectItem>
              <SelectItem value="hospital">Hospitals</SelectItem>
              <SelectItem value="clinic">Clinics</SelectItem>
              <SelectItem value="pharmacy">Pharmacies</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <Select value={radius.toString()} onValueChange={(val) => setRadius(Number(val))}>
            <SelectTrigger className="w-[140px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Within 5 km</SelectItem>
              <SelectItem value="10">Within 10 km</SelectItem>
              <SelectItem value="20">Within 20 km</SelectItem>
              <SelectItem value="50">Within 50 km</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Finding healthcare providers...</p>
          </div>
        )}

        {!loading && !location && (
          <div className="text-center py-12 space-y-3">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Enable location to find healthcare providers near you</p>
          </div>
        )}

        {!loading && filteredListings.length === 0 && location && (
          <div className="text-center py-12 space-y-3">
            <p className="text-muted-foreground">No healthcare providers found nearby</p>
            <Button variant="outline" onClick={() => setRadius(radius * 2)}>
              Expand Search Radius
            </Button>
          </div>
        )}

        {!loading && filteredListings.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredListings.map((listing) => (
              <CategoryCard
                key={listing.id}
                result={listing}
                onCall={handleCall}
                onDirections={handleDirections}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
