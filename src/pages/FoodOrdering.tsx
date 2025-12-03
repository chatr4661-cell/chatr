import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Clock, Star, Search, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { chatrLocalSearch } from '@/lib/chatrClient';
import { Skeleton } from '@/components/ui/skeleton';

export default function FoodOrdering() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { location, loading: locationLoading } = useChatrLocation();

  useEffect(() => {
    if (location?.lat && location?.lon) {
      loadVendors();
    }
  }, [location?.lat, location?.lon]);

  const loadVendors = async () => {
    if (!location?.lat || !location?.lon) return;
    
    setLoading(true);
    try {
      const results = await chatrLocalSearch('restaurant food', location.lat, location.lon);
      
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

  const loadMenu = async (vendorId: string) => {
    setMenuItems([
      { id: '1', name: 'Biryani', description: 'Delicious chicken biryani', price: 250, is_vegetarian: false },
      { id: '2', name: 'Dal Makhani', description: 'Creamy black lentils', price: 180, is_vegetarian: true },
      { id: '3', name: 'Butter Chicken', description: 'Rich tomato curry', price: 300, is_vegetarian: false },
      { id: '4', name: 'Paneer Tikka', description: 'Grilled cottage cheese', price: 220, is_vegetarian: true },
    ]);
  };

  const handleVendorSelect = (vendor: any) => {
    setSelectedVendor(vendor);
    loadMenu(vendor.id);
  };

  const addToCart = (item: any) => {
    setCart([...cart, item]);
    toast.success(`${item.name} added to cart`);
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.price, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    toast.success('Order placed! 🍔');
    setCart([]);
    setSelectedVendor(null);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-emerald-500';
    if (rating >= 4.0) return 'bg-green-500';
    if (rating >= 3.5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatReviewCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (selectedVendor) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-card border-b sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedVendor(null)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold">{selectedVendor.name}</h1>
                <p className="text-xs text-muted-foreground">{selectedVendor.cuisine_type}</p>
              </div>
            </div>
            <Button onClick={handleCheckout} disabled={cart.length === 0}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              {cart.length} items · ₹{getTotalAmount()}
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {menuItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex gap-4">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      {item.is_vegetarian && <Badge variant="outline" className="mt-1">🌱 Veg</Badge>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">₹{item.price}</p>
                      <Button size="sm" className="mt-2" onClick={() => addToCart(item)}>
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Food & Restaurants</h1>
            <p className="text-xs text-muted-foreground">Discover nearby dining options</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-0"
          />
        </div>

        {/* Section Title */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Recommended</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Results */}
        <div className="space-y-4">
          {locationLoading || loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !location ? (
            <Card className="overflow-hidden">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">Enable location</p>
                <p className="text-sm text-muted-foreground">To find restaurants near you</p>
              </CardContent>
            </Card>
          ) : vendors.length === 0 ? (
            <Card className="overflow-hidden">
              <CardContent className="p-8 text-center">
                <p className="text-lg font-semibold text-muted-foreground">No restaurants found</p>
                <p className="text-sm text-muted-foreground mt-1">Try searching for something else</p>
              </CardContent>
            </Card>
          ) : (
            vendors.map((vendor) => (
              <Card 
                key={vendor.id} 
                className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300"
                onClick={() => handleVendorSelect(vendor)}
              >
                {/* Image Section */}
                <div className="relative h-48 bg-muted">
                  {vendor.avatar_url ? (
                    <img 
                      src={vendor.avatar_url} 
                      alt={vendor.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-4xl">🍽️</span>
                    </div>
                  )}
                  
                  {/* Overlaid Badge */}
                  {vendor.rating_average >= 4.0 && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-medium px-3 py-1">
                        Top Rated
                      </Badge>
                    </div>
                  )}
                  
                  {/* Rating Badge */}
                  <div className={`absolute top-3 right-3 ${getRatingColor(vendor.rating_average)} text-white text-sm font-bold px-2 py-1 rounded-md flex items-center gap-1`}>
                    <Star className="w-3 h-3 fill-current" />
                    {vendor.rating_average.toFixed(1)}
                  </div>
                  
                  {/* Price Badge */}
                  {vendor.price && (
                    <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium px-2 py-1 rounded-md">
                      ₹{vendor.price} per person
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {vendor.name}
                      </h3>
                      
                      {/* Rating & Reviews */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-medium">{vendor.rating_average.toFixed(2)}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ({formatReviewCount(vendor.rating_count)} reviews)
                        </span>
                      </div>

                      {/* Price & Time */}
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        {vendor.price && (
                          <>
                            <span className="font-medium text-foreground">₹{vendor.price}</span>
                            <span>•</span>
                          </>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {vendor.delivery_time_min} mins
                        </span>
                        {vendor.distance && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {vendor.distance.toFixed(1)} km
                            </span>
                          </>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {vendor.description}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {vendor.cuisine_type && (
                          <Badge variant="secondary" className="text-xs font-normal bg-primary/10 text-primary hover:bg-primary/20">
                            {vendor.cuisine_type}
                          </Badge>
                        )}
                        {vendor.services?.slice(0, 3).map((service: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs font-normal">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Add Button */}
                    <Button 
                      size="sm" 
                      className="rounded-full px-5 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVendorSelect(vendor);
                      }}
                    >
                      Add
                    </Button>
                  </div>

                  {/* View Details Link */}
                  <div className="mt-3 pt-3 border-t">
                    <button 
                      className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (vendor.url) {
                          window.open(vendor.url, '_blank');
                        } else {
                          handleVendorSelect(vendor);
                        }
                      }}
                    >
                      View details
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
