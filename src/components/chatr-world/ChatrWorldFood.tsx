import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Clock, Truck, Plus, Minus, ShoppingCart, Loader2, Utensils } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine_type: string[];
  address: string;
  city: string;
  image_url: string;
  rating_average: number;
  rating_count: number;
  price_range: string;
  delivery_available: boolean;
  delivery_fee: number;
  min_order_amount: number;
  opening_time: string;
  closing_time: string;
}

interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_spicy: boolean;
  preparation_time: number;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface ChatrWorldFoodProps {
  location?: { lat: number; lon: number; city?: string } | null;
}

const cuisineTypes = ['All', 'Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 'Fast Food', 'Desserts'];

export function ChatrWorldFood({ location }: ChatrWorldFoodProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    fetchRestaurants();
  }, [cuisine]);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chatr_restaurants')
        .select('*')
        .eq('is_active', true)
        .order('rating_average', { ascending: false });

      if (cuisine !== 'All') {
        query = query.contains('cuisine_type', [cuisine]);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async (restaurantId: string) => {
    setLoadingMenu(true);
    try {
      const { data, error } = await supabase
        .from('chatr_menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('category');

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoadingMenu(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
      return updated;
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.cuisine_type?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePlaceOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to place order');
        return;
      }

      const { error } = await supabase.from('chatr_food_orders').insert({
        user_id: user.id,
        restaurant_id: selectedRestaurant?.id,
        items: cart.map(item => ({
          item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        subtotal: cartTotal,
        delivery_fee: selectedRestaurant?.delivery_fee || 0,
        total: cartTotal + (selectedRestaurant?.delivery_fee || 0),
        status: 'pending'
      });

      if (error) throw error;

      toast.success('Order placed successfully!');
      setCart([]);
      setSelectedRestaurant(null);
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search restaurants, cuisines..."
            className="pl-10"
          />
        </div>
        <Select value={cuisine} onValueChange={setCuisine}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Cuisine" />
          </SelectTrigger>
          <SelectContent>
            {cuisineTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Cart Button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cart
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Your Cart</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Cart is empty</p>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">₹{item.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCartQuantity(item.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCartQuantity(item.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{cartTotal}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Delivery</span>
                      <span>₹{selectedRestaurant?.delivery_fee || 0}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>₹{cartTotal + (selectedRestaurant?.delivery_fee || 0)}</span>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handlePlaceOrder}>
                    Place Order
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Restaurants Grid */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRestaurants.map(restaurant => (
            <Card key={restaurant.id} className="hover:shadow-lg transition-all overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-orange-100 to-yellow-100 relative">
                {restaurant.image_url ? (
                  <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Utensils className="h-12 w-12 text-orange-300" />
                  </div>
                )}
                {restaurant.delivery_available && (
                  <Badge className="absolute top-2 right-2 bg-green-500">
                    <Truck className="h-3 w-3 mr-1" /> Delivery
                  </Badge>
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                <div className="flex flex-wrap gap-1">
                  {restaurant.cuisine_type?.slice(0, 3).map(c => (
                    <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {restaurant.rating_average?.toFixed(1) || 'N/A'}
                  </span>
                  <span className="text-muted-foreground">{restaurant.price_range}</span>
                  {restaurant.opening_time && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {restaurant.opening_time}
                    </span>
                  )}
                </div>
                {restaurant.min_order_amount > 0 && (
                  <p className="text-xs text-muted-foreground">Min order: ₹{restaurant.min_order_amount}</p>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedRestaurant(restaurant);
                        fetchMenu(restaurant.id);
                      }}
                    >
                      View Menu
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{restaurant.name} - Menu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {loadingMenu ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : menuItems.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No menu items available</p>
                      ) : (
                        <div className="grid gap-4">
                          {menuItems.map(item => (
                            <div key={item.id} className="flex gap-4 p-3 rounded-lg border">
                              {item.image_url && (
                                <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium flex items-center gap-2">
                                      {item.name}
                                      {item.is_vegetarian && <span className="text-green-500">🟢</span>}
                                      {item.is_spicy && <span>🌶️</span>}
                                    </p>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                                    <p className="font-medium text-primary mt-1">₹{item.price}</p>
                                  </div>
                                  <Button size="sm" onClick={() => addToCart(item)}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRestaurants.length === 0 && (
        <div className="text-center py-12">
          <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No restaurants found</h3>
          <p className="text-sm text-muted-foreground">Try a different cuisine or search term</p>
        </div>
      )}
    </div>
  );
}