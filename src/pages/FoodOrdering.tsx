import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Clock, Star, Search, MapPin } from 'lucide-react';
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
    // Mock menu items for selected vendor
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
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-500/5 to-background pb-20">
      <div className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
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

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Vendors */}
        <div className="space-y-3">
          {locationLoading || loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Skeleton className="w-20 h-20 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-full" />
                        <div className="flex gap-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !location ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-2">Enable location to find restaurants near you</p>
                <p className="text-xs text-muted-foreground">Grant location permission in your browser</p>
              </CardContent>
            </Card>
          ) : vendors.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground space-y-2">
                  <p className="text-lg font-semibold">No restaurants available</p>
                  <p className="text-sm">Check back soon for delicious food options!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            vendors.map((vendor) => (
              <Card key={vendor.id} onClick={() => handleVendorSelect(vendor)} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {vendor.avatar_url && (
                      <img src={vendor.avatar_url} alt={vendor.name} className="w-20 h-20 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{vendor.name}</h3>
                      <p className="text-sm text-muted-foreground">{vendor.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{vendor.rating_average.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {vendor.delivery_time_min}-{vendor.delivery_time_max} mins
                        </div>
                      </div>
                      <Badge variant="outline" className="mt-2">{vendor.cuisine_type}</Badge>
                    </div>
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
