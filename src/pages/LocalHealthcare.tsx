import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Navigation, Star, Phone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocationStatus } from '@/hooks/useLocationStatus';

interface HealthcareListing {
  id: string;
  name: string;
  type: string;
  description?: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  phone_number?: string;
  timings?: string;
  specialties?: string[];
  services_offered?: string[];
  rating_average: number;
  rating_count: number;
  verified: boolean;
}

export default function LocalHealthcare() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listings, setListings] = useState<HealthcareListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<HealthcareListing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>();
  const [radiusKm, setRadiusKm] = useState(10);
  const { status } = useLocationStatus(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (status.latitude && status.longitude) {
      fetchAndLoadHealthcare(status.latitude, status.longitude);
    }
  }, [status.latitude, status.longitude, radiusKm]);

  useEffect(() => {
    filterListings();
  }, [listings, selectedType, searchQuery]);

  const fetchAndLoadHealthcare = async (latitude: number, longitude: number) => {
    setLoading(true);
    try {
      console.log('Fetching healthcare near:', latitude, longitude, 'radius:', radiusKm);
      
      // Call edge function to fetch and populate healthcare based on GPS location
      const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke('fetch-healthcare', {
        body: { latitude, longitude, radius: radiusKm }
      });

      if (edgeFunctionError) {
        console.error('Edge function error:', edgeFunctionError);
        toast({
          title: 'Error',
          description: 'Failed to fetch healthcare providers',
          variant: 'destructive'
        });
        return;
      }

      console.log('Edge function response:', edgeFunctionData);

      // Load healthcare listings from database
      const { data, error } = await supabase
        .from('healthcare_db')
        .select('*')
        .order('distance', { ascending: true })
        .order('verified', { ascending: false })
        .order('rating_average', { ascending: false });

      if (error) throw error;
      
      // Filter by radius on client side as well
      const providersInRadius = (data || []).filter((provider: HealthcareListing) => 
        !provider.distance || provider.distance <= radiusKm
      );
      
      setListings(providersInRadius);
      toast({
        title: 'Success',
        description: `Found ${providersInRadius.length} providers within ${radiusKm}km`
      });
    } catch (error) {
      console.error('Error loading healthcare listings:', error);
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
      filtered = filtered.filter(l => l.type === selectedType);
    }

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
            action_type: 'view'
          });
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const openDirections = (listing: HealthcareListing) => {
    if (listing.latitude && listing.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Healthcare Near You
              </h1>
              <p className="text-sm text-muted-foreground">
                {filteredListings.length} providers
              </p>
            </div>
          </div>
          {status.city && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Navigation className="h-4 w-4 text-primary" />
              <span>{status.city}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Distance Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Within</span>
          </div>
          <div className="flex gap-2">
            {[5, 10, 20].map(km => (
              <Button
                key={km}
                size="sm"
                variant={radiusKm === km ? 'default' : 'outline'}
                onClick={() => setRadiusKm(km)}
              >
                {km} km
              </Button>
            ))}
          </div>
        </div>

        {/* Search */}
        <Input
          type="text"
          placeholder="Search clinics, specialties, services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Type Filter */}
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="clinic">Clinics</TabsTrigger>
            <TabsTrigger value="hospital">Hospitals</TabsTrigger>
            <TabsTrigger value="pharmacy">Pharmacy</TabsTrigger>
            <TabsTrigger value="lab">Labs</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading / Error States */}
        {status.isLoading || loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Finding healthcare providers near you...</p>
          </div>
        ) : !status.latitude ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-2">Enable location to find healthcare providers near you</p>
            <p className="text-xs text-muted-foreground">Grant location permission in your browser</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-2">No healthcare providers found within {radiusKm}km</p>
            <p className="text-xs text-muted-foreground">Try increasing the radius or changing filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Found {filteredListings.length} provider{filteredListings.length !== 1 ? 's' : ''} within {radiusKm}km
            </p>
            {filteredListings.map(listing => (
              <HealthcareCard
                key={listing.id}
                listing={listing}
                onView={trackView}
                onDirections={openDirections}
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
  onView,
  onDirections
}: {
  listing: HealthcareListing;
  onView: (id: string) => void;
  onDirections: (listing: HealthcareListing) => void;
}) {
  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-lg">{listing.name}</h3>
            {listing.verified && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                ✓ Verified
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground capitalize">{listing.type}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {listing.rating_count > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{listing.rating_average.toFixed(1)}</span>
              <span className="text-muted-foreground">({listing.rating_count})</span>
            </div>
          )}
          {listing.distance !== undefined && (
            <Badge variant="outline" className="bg-primary/10 text-primary font-semibold">
              {listing.distance} km
            </Badge>
          )}
        </div>
      </div>

      {listing.specialties && listing.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {listing.specialties.slice(0, 3).map((specialty, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {specialty}
            </Badge>
          ))}
        </div>
      )}

      {listing.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {listing.description}
        </p>
      )}

      {listing.timings && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Clock className="h-4 w-4" />
          <span>{listing.timings}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <MapPin className="h-4 w-4" />
        <span className="line-clamp-1">{listing.address}, {listing.city}</span>
      </div>

      <div className="flex items-center gap-2">
        {listing.phone_number && (
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <a href={`tel:${listing.phone_number}`}>
              <Phone className="h-4 w-4 mr-1" />
              Call
            </a>
          </Button>
        )}
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1"
          onClick={() => onDirections(listing)}
        >
          <Navigation className="h-4 w-4 mr-1" />
          Directions
        </Button>
      </div>
    </Card>
  );
}