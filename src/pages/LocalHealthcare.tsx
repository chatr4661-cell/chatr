import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Plus, Star, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LocationFilter } from '@/components/LocationFilter';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HealthcareListing {
  id: string;
  name: string;
  type: string;
  description?: string;
  address: string;
  city: string;
  pincode: string;
  phone_number?: string;
  specialties?: string[];
  services_offered?: string[];
  rating_average: number;
  rating_count: number;
  verified: boolean;
  is_monetized: boolean;
}

export default function LocalHealthcare() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listings, setListings] = useState<HealthcareListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<HealthcareListing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [location, setLocation] = useState<{ city: string; pincode: string; latitude?: number; longitude?: number }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAndLoadHealthcare();
  }, [location]);

  useEffect(() => {
    filterListings();
  }, [listings, location, searchQuery, selectedType]);

  const fetchAndLoadHealthcare = async () => {
    setLoading(true);
    try {
      // Fetch healthcare providers from external sources via edge function
      await supabase.functions.invoke('fetch-healthcare', {
        body: { 
          city: location?.city,
          latitude: location?.latitude,
          longitude: location?.longitude
        }
      });

      // Load healthcare providers from database
      const { data, error } = await supabase
        .from('healthcare_db')
        .select('*')
        .order('verified', { ascending: false })
        .order('rating_average', { ascending: false })
        .limit(100);

      if (error) throw error;
      setListings(data || []);
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
    let filtered = listings;

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(l => l.type === selectedType);
    }

    // Location filter
    if (location?.city) {
      filtered = filtered.filter(l =>
        l.city.toLowerCase().includes(location.city.toLowerCase())
      );
    } else if (location?.pincode) {
      filtered = filtered.filter(l => l.pincode === location.pincode);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        l.services_offered?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredListings(filtered);
  };

  const trackView = async (listingId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('monetization_leads')
          .insert({
            lead_type: 'healthcare',
            listing_id: listingId,
            listing_type: 'healthcare_db',
            user_id: user.id,
            action_type: 'view',
            location_city: location?.city,
            location_pincode: location?.pincode
          });
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Healthcare Near You</h1>
            <p className="text-sm text-muted-foreground">
              {filteredListings.length} providers
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <LocationFilter onLocationChange={setLocation} />

        <Input
          type="text"
          placeholder="Search clinics, specialties, services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="clinic">Clinics</TabsTrigger>
            <TabsTrigger value="hospital">Hospitals</TabsTrigger>
            <TabsTrigger value="pharmacy">Pharmacy</TabsTrigger>
            <TabsTrigger value="lab">Labs</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No healthcare providers found in your area</p>
            <p className="text-xs text-muted-foreground">Try adjusting your location or search filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredListings.map(listing => (
              <HealthcareCard
                key={listing.id}
                listing={listing}
                onView={trackView}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function HealthcareCard({
  listing,
  onView
}: {
  listing: HealthcareListing;
  onView: (id: string) => void;
}) {
  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onView(listing.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{listing.name}</h3>
            {listing.verified && (
              <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
                ✓ Verified
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground capitalize">{listing.type}</p>
        </div>
        {listing.rating_count > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{listing.rating_average.toFixed(1)}</span>
            <span className="text-muted-foreground">({listing.rating_count})</span>
          </div>
        )}
      </div>

      {listing.specialties && listing.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {listing.specialties.slice(0, 3).map((specialty, idx) => (
            <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              {specialty}
            </span>
          ))}
        </div>
      )}

      {listing.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {listing.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{listing.city}, {listing.pincode}</span>
        </div>
        {listing.phone_number && (
          <Button variant="ghost" size="sm" className="h-7">
            <Phone className="h-3 w-3 mr-1" />
            Call
          </Button>
        )}
      </div>
    </Card>
  );
}
