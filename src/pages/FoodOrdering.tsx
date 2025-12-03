import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Star, Search, MapPin, ChevronRight, Navigation, Phone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { chatrLocalSearch } from '@/lib/chatrClient';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function FoodOrdering() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [customLocation, setCustomLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const { location, loading: locationLoading } = useChatrLocation();

  const activeLocation = customLocation || (location ? { lat: location.lat, lon: location.lon, name: location.city || 'Current Location' } : null);

  useEffect(() => {
    if (activeLocation?.lat && activeLocation?.lon) {
      loadVendors();
    }
  }, [activeLocation?.lat, activeLocation?.lon]);

  const loadVendors = async () => {
    if (!activeLocation?.lat || !activeLocation?.lon) return;
    
    setLoading(true);
    try {
      const results = await chatrLocalSearch('restaurant food', activeLocation.lat, activeLocation.lon);
      
      if (results && results.length > 0) {
        const mappedVendors = results.map((item: any) => ({
          id: item.id || Math.random().toString(),
          name: item.name,
          description: item.description || 'Local restaurant',
          avatar_url: item.image_url,
          rating_average: item.rating || 4.2,
          rating_count: item.rating_count || 0,
          delivery_time_min: 25,
          delivery_time_max: 35,
          cuisine_type: item.category || 'Multi-cuisine',
          distance: item.distance,
          price: item.price,
          services: item.services || [],
          url: item.url,
          address: item.address || '',
          phone: item.phone || '',
        }));
        setVendors(mappedVendors);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleSetLocation = () => {
    if (!locationInput.trim()) {
      toast.error('Please enter a location');
      return;
    }
    // For now, use a default coordinate with the location name
    // In production, this would geocode the address
    setCustomLocation({
      lat: location?.lat || 28.6139,
      lon: location?.lon || 77.2090,
      name: locationInput.trim()
    });
    setShowLocationPicker(false);
    setLocationInput('');
    toast.success(`Location set to ${locationInput.trim()}`);
  };

  const useCurrentLocation = () => {
    setCustomLocation(null);
    setShowLocationPicker(false);
    toast.success('Using your current location');
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.0) return 'bg-green-600';
    if (rating >= 3.5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.cuisine_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Food Delivery</h1>
            </div>
          </div>
          
          {/* Location Picker */}
          <button 
            onClick={() => setShowLocationPicker(true)}
            className="flex items-center gap-2 mt-2 w-full p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span className="flex-1 text-left text-sm font-medium truncate">
              {activeLocation?.name || 'Select your location'}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search for restaurants, cuisines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-0 h-11"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['All', 'Fast Food', 'Indian', 'Chinese', 'Italian', 'Pizza', 'Biryani'].map((filter) => (
            <Badge 
              key={filter} 
              variant={filter === 'All' ? 'default' : 'outline'}
              className="shrink-0 cursor-pointer px-4 py-1.5"
            >
              {filter}
            </Badge>
          ))}
        </div>

        {/* Restaurant List */}
        <div className="space-y-3">
          {locationLoading || loading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="flex gap-3 p-3">
                  <Skeleton className="w-24 h-24 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </Card>
            ))
          ) : !activeLocation ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <p className="font-semibold mb-1">Set your location</p>
                <p className="text-sm text-muted-foreground mb-4">To discover restaurants near you</p>
                <Button onClick={() => setShowLocationPicker(true)}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Set Location
                </Button>
              </CardContent>
            </Card>
          ) : filteredVendors.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg font-semibold">No restaurants found</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different location or search</p>
              </CardContent>
            </Card>
          ) : (
            filteredVendors.map((vendor) => (
              <Card 
                key={vendor.id} 
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3 p-3">
                  {/* Restaurant Image */}
                  <div className="relative w-24 h-24 shrink-0">
                    {vendor.avatar_url ? (
                      <img 
                        src={vendor.avatar_url} 
                        alt={vendor.name} 
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/10 rounded-xl flex items-center justify-center">
                        <span className="text-3xl">🍽️</span>
                      </div>
                    )}
                    {/* Rating Badge */}
                    <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${getRatingColor(vendor.rating_average)} text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-0.5`}>
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {vendor.rating_average.toFixed(1)}
                    </div>
                  </div>

                  {/* Restaurant Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base line-clamp-1">{vendor.name}</h3>
                    
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {vendor.cuisine_type}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {vendor.delivery_time_min}-{vendor.delivery_time_max} min
                      </span>
                      {vendor.distance && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {vendor.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    {vendor.price && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ₹{vendor.price} for one
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-2">
                      {vendor.phone && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-7 text-xs px-2"
                          onClick={() => window.open(`tel:${vendor.phone}`, '_self')}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                      )}
                      {vendor.url && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-7 text-xs px-2"
                          onClick={() => window.open(vendor.url, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      )}
                      <Button 
                        size="sm"
                        className="h-7 text-xs px-3 ml-auto"
                        onClick={() => {
                          if (vendor.url) {
                            window.open(vendor.url, '_blank');
                          } else {
                            toast.info('Opening directions...');
                          }
                        }}
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        Directions
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Location Picker Dialog */}
      <Dialog open={showLocationPicker} onOpenChange={setShowLocationPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set your delivery location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12"
              onClick={useCurrentLocation}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Navigation className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Use current location</p>
                <p className="text-xs text-muted-foreground">Using GPS</p>
              </div>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or enter manually</span>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Enter area, street name, landmark..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                className="h-11"
              />
              <Button 
                className="w-full" 
                onClick={handleSetLocation}
                disabled={!locationInput.trim()}
              >
                Confirm Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
