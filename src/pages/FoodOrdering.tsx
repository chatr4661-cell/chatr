import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Star, Search, MapPin, ChevronRight, Navigation, Phone, ExternalLink, Filter, Flame, Leaf, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { chatrLocalSearch } from '@/lib/chatrClient';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Helmet } from 'react-helmet-async';

const cuisineFilters = [
  { id: 'all', name: 'All', emoji: '🍽️' },
  { id: 'biryani', name: 'Biryani', emoji: '🍚' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕' },
  { id: 'burger', name: 'Burger', emoji: '🍔' },
  { id: 'chinese', name: 'Chinese', emoji: '🥡' },
  { id: 'south', name: 'South Indian', emoji: '🥘' },
  { id: 'north', name: 'North Indian', emoji: '🍛' },
  { id: 'dessert', name: 'Desserts', emoji: '🍰' },
];

const featuredRestaurants = [
  { name: 'Biryani House', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop', rating: 4.5, time: '30 min', offer: '50% OFF' },
  { name: 'Pizza Palace', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop', rating: 4.3, time: '25 min', offer: 'Free Delivery' },
  { name: 'Burger King', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop', rating: 4.4, time: '20 min', offer: '₹100 OFF' },
];

export default function FoodOrdering() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [customLocation, setCustomLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [selectedCuisine, setSelectedCuisine] = useState('all');
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
          rating: item.rating || (4 + Math.random() * 0.8),
          reviews: item.rating_count || Math.floor(Math.random() * 2000) + 100,
          delivery_time: Math.floor(Math.random() * 20) + 20,
          cuisine_type: item.category || 'Multi-cuisine',
          distance: item.distance,
          price: item.price || Math.floor(Math.random() * 200) + 150,
          url: item.url,
          address: item.address || '',
          phone: item.phone || '',
          isVeg: Math.random() > 0.7,
          isBestseller: Math.random() > 0.7,
          offer: Math.random() > 0.5 ? `${Math.floor(Math.random() * 30) + 10}% OFF` : null,
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
    if (!locationInput.trim()) return;
    setCustomLocation({ lat: location?.lat || 28.6139, lon: location?.lon || 77.2090, name: locationInput.trim() });
    setShowLocationPicker(false);
    setLocationInput('');
    toast.success(`Location set to ${locationInput.trim()}`);
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
      <Helmet>
        <title>Food Delivery - Order from Top Restaurants | Chatr</title>
        <meta name="description" content="Order food from the best restaurants near you. Fast delivery, great offers, and delicious food at your doorstep." />
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
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
            className="flex items-center gap-2 mt-2 w-full p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-primary/20"
          >
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs text-muted-foreground">Deliver to</p>
              <p className="text-sm font-medium truncate">{activeLocation?.name || 'Select location'}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search restaurants, cuisines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl bg-muted/50 border-0 text-base"
          />
        </div>

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800')] opacity-20 bg-cover bg-center" />
          <div className="relative p-5">
            <Badge className="bg-white/20 text-white border-0 mb-2">🔥 Hot Deal</Badge>
            <h2 className="text-xl font-bold text-white mb-1">60% OFF up to ₹120</h2>
            <p className="text-white/80 text-sm mb-3">On orders above ₹199 • Use code: CHATR60</p>
            <Button size="sm" variant="secondary" className="bg-white text-red-500 hover:bg-white/90">
              Order Now
            </Button>
          </div>
        </div>

        {/* Cuisine Filters */}
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {cuisineFilters.map((cuisine) => (
              <button
                key={cuisine.id}
                onClick={() => setSelectedCuisine(cuisine.id)}
                className={`flex flex-col items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl transition-all ${
                  selectedCuisine === cuisine.id 
                    ? 'bg-primary/10 border-primary/30 border' 
                    : 'hover:bg-muted'
                }`}
              >
                <span className="text-2xl">{cuisine.emoji}</span>
                <span className={`text-xs font-medium ${selectedCuisine === cuisine.id ? 'text-primary' : ''}`}>{cuisine.name}</span>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Featured */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Featured Restaurants</h2>
          </div>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
              {featuredRestaurants.map((restaurant, i) => (
                <Card key={i} className="shrink-0 w-44 overflow-hidden cursor-pointer hover:shadow-lg transition-all group">
                  <div className="relative h-28 overflow-hidden">
                    <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    {restaurant.offer && (
                      <Badge className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5">{restaurant.offer}</Badge>
                    )}
                    <div className={`absolute bottom-2 left-2 ${getRatingColor(restaurant.rating)} text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5`}>
                      <Star className="w-2.5 h-2.5 fill-current" />{restaurant.rating}
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm line-clamp-1">{restaurant.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />{restaurant.time}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Restaurant List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">All Restaurants</h2>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Filter className="w-3.5 h-3.5" />Sort
            </Button>
          </div>

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
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="font-semibold mb-1">Set your location</p>
                  <p className="text-sm text-muted-foreground mb-4">To discover restaurants near you</p>
                  <Button onClick={() => setShowLocationPicker(true)}>
                    <Navigation className="w-4 h-4 mr-2" />Set Location
                  </Button>
                </CardContent>
              </Card>
            ) : filteredVendors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-lg font-semibold">No restaurants found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try a different location</p>
                </CardContent>
              </Card>
            ) : (
              filteredVendors.map((vendor) => (
                <Card key={vendor.id} className="overflow-hidden hover:shadow-lg transition-all">
                  <div className="flex gap-3 p-3">
                    {/* Restaurant Image */}
                    <div className="relative w-28 h-28 shrink-0">
                      {vendor.avatar_url ? (
                        <img src={vendor.avatar_url} alt={vendor.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/10 rounded-xl flex items-center justify-center">
                          <span className="text-4xl">🍽️</span>
                        </div>
                      )}
                      {vendor.offer && (
                        <Badge className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[9px] px-1.5 py-0.5">{vendor.offer}</Badge>
                      )}
                      <div className={`absolute bottom-1.5 left-1.5 ${getRatingColor(vendor.rating)} text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5`}>
                        <Star className="w-2.5 h-2.5 fill-current" />{vendor.rating.toFixed(1)}
                      </div>
                    </div>

                    {/* Restaurant Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1">
                        <h3 className="font-semibold line-clamp-1 flex-1">{vendor.name}</h3>
                        {vendor.isVeg && <Leaf className="w-4 h-4 text-green-600 shrink-0" />}
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{vendor.cuisine_type}</p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{vendor.delivery_time} min</span>
                        {vendor.distance && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{vendor.distance.toFixed(1)} km</span>}
                      </div>

                      <p className="text-xs text-muted-foreground mt-1">₹{vendor.price} for one</p>

                      {vendor.isBestseller && (
                        <Badge variant="secondary" className="mt-2 bg-amber-500/10 text-amber-600 border-0 text-[10px]">
                          <Flame className="w-3 h-3 mr-0.5" />Bestseller
                        </Badge>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-2">
                        {vendor.phone && (
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => window.open(`tel:${vendor.phone}`)}>
                            <Phone className="w-3 h-3 mr-1" />Call
                          </Button>
                        )}
                        {vendor.url && (
                          <Button size="sm" className="h-7 text-xs px-3" onClick={() => window.open(vendor.url, '_blank')}>
                            <ExternalLink className="w-3 h-3 mr-1" />View Menu
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Location Dialog */}
      <Dialog open={showLocationPicker} onOpenChange={setShowLocationPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Set delivery location</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Button variant="outline" className="w-full justify-start gap-3 h-14" onClick={() => { setCustomLocation(null); setShowLocationPicker(false); }}>
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Use current location</p>
                <p className="text-xs text-muted-foreground">Using GPS</p>
              </div>
            </Button>
            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or enter manually</span></div></div>
            <Input placeholder="Enter area, street, landmark..." value={locationInput} onChange={(e) => setLocationInput(e.target.value)} className="h-12" />
            <Button className="w-full h-12" onClick={handleSetLocation} disabled={!locationInput.trim()}>Confirm Location</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
