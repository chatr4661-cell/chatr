import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Clock, Plus, Minus, ShoppingCart, Loader2, Heart, ChevronRight, Home, User, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  cuisine_type?: string[];
  address?: string;
  city?: string;
  image_url?: string;
  rating_average?: number;
  rating_count?: number;
  price_range?: string;
  delivery_available?: boolean;
  delivery_fee?: number;
  min_order_amount?: number;
  delivery_time?: string;
}

interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_spicy?: boolean;
  preparation_time?: number;
  calories?: number;
  rating?: number;
  rating_count?: number;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface ChatrWorldFoodProps {
  location?: { lat: number; lon: number; city?: string } | null;
}

const menuCategories = ['Meals', 'Sides', 'Snacks', 'Desserts', 'Drinks'];

export function ChatrWorldFood({ location }: ChatrWorldFoodProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Meals');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chatr_restaurants')
        .select('*')
        .eq('is_active', true)
        .order('rating_average', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      // Demo data
      setRestaurants([
        {
          id: '1',
          name: 'Spice Paradise',
          description: 'Authentic Indian cuisine',
          cuisine_type: ['Indian', 'Asian'],
          address: 'MG Road',
          city: location?.city || 'Delhi',
          image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
          rating_average: 4.8,
          rating_count: 234,
          price_range: '$$',
          delivery_available: true,
          delivery_fee: 30,
          min_order_amount: 200,
          delivery_time: '25-35 min'
        }
      ]);
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
      // Demo menu items
      setMenuItems([
        { id: '1', restaurant_id: restaurantId, name: 'Spicy Noodles', description: 'Stir-fried noodles with vegetables', price: 180, category: 'Meals', image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200', is_vegetarian: true, is_vegan: false, is_spicy: true, preparation_time: 15, calories: 450, rating: 4.7, rating_count: 89 },
        { id: '2', restaurant_id: restaurantId, name: 'Shrimp Pasta', description: 'Creamy pasta with garlic shrimp', price: 280, category: 'Meals', image_url: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=200', is_vegetarian: false, is_vegan: false, is_spicy: false, preparation_time: 20, calories: 520, rating: 4.9, rating_count: 124 },
        { id: '3', restaurant_id: restaurantId, name: 'Vegetable Curry', description: 'Mixed vegetables in curry sauce', price: 150, category: 'Meals', image_url: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=200', is_vegetarian: true, is_vegan: true, is_spicy: true, preparation_time: 18, calories: 380, rating: 4.6, rating_count: 76 },
        { id: '4', restaurant_id: restaurantId, name: 'Mixed Salad', description: 'Fresh garden salad', price: 120, category: 'Sides', image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200', is_vegetarian: true, is_vegan: true, is_spicy: false, preparation_time: 5, calories: 180, rating: 4.5, rating_count: 45 },
        { id: '5', restaurant_id: restaurantId, name: 'Jollof Rice', description: 'West African spiced rice with tomatoes', price: 160, category: 'Meals', image_url: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=200', is_vegetarian: true, is_vegan: false, is_spicy: false, preparation_time: 25, calories: 420, rating: 4.8, rating_count: 156 },
        { id: '6', restaurant_id: restaurantId, name: 'Chicken Pasta Salad', description: 'Grilled chicken with pasta', price: 220, category: 'Meals', image_url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200', is_vegetarian: false, is_vegan: false, is_spicy: false, preparation_time: 15, calories: 480, rating: 4.7, rating_count: 98 },
        { id: '7', restaurant_id: restaurantId, name: 'Beef Salad', description: 'Sliced beef with greens', price: 250, category: 'Meals', image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200', is_vegetarian: false, is_vegan: false, is_spicy: false, preparation_time: 20, calories: 350, rating: 4.6, rating_count: 67 },
        { id: '8', restaurant_id: restaurantId, name: 'Fried Plantain', description: 'Crispy fried plantains', price: 80, category: 'Sides', image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200', is_vegetarian: true, is_vegan: true, is_spicy: false, preparation_time: 10, calories: 200, rating: 4.4, rating_count: 34 },
        { id: '9', restaurant_id: restaurantId, name: 'Coleslaw', description: 'Fresh cabbage slaw', price: 60, category: 'Sides', image_url: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=200', is_vegetarian: true, is_vegan: false, is_spicy: false, preparation_time: 5, calories: 120, rating: 4.3, rating_count: 28 },
      ]);
    } finally {
      setLoadingMenu(false);
    }
  };

  const toggleFavorite = (itemId: string) => {
    setFavorites(prev => {
      const newFavs = new Set(prev);
      if (newFavs.has(itemId)) {
        newFavs.delete(itemId);
      } else {
        newFavs.add(itemId);
      }
      return newFavs;
    });
  };

  const addToCart = (item: MenuItem, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, quantity }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
        items: cart.map(item => ({ item_id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
        subtotal: cartTotal,
        delivery_fee: selectedRestaurant?.delivery_fee || 0,
        total: cartTotal + (selectedRestaurant?.delivery_fee || 0),
        status: 'pending'
      });

      if (error) throw error;

      toast.success('Order placed successfully!');
      setCart([]);
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order');
    }
  };

  const filteredMenu = menuItems.filter(item => 
    item.category.toLowerCase() === selectedCategory.toLowerCase()
  );

  // Item Detail View
  if (selectedItem) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right">
        <Button variant="ghost" onClick={() => setSelectedItem(null)} className="gap-2">
          <ChevronRight className="h-4 w-4 rotate-180" />
          Back
        </Button>

        <div className="relative">
          <div className="aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden bg-muted">
            {selectedItem.image_url ? (
              <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-4 right-4 h-10 w-10 rounded-full bg-white shadow",
              favorites.has(selectedItem.id) && "text-red-500"
            )}
            onClick={() => toggleFavorite(selectedItem.id)}
          >
            <Heart className={cn("h-5 w-5", favorites.has(selectedItem.id) && "fill-current")} />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedItem.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{selectedItem.rating}</span>
                <span className="text-muted-foreground">({selectedItem.rating_count} ratings)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-full border-orange-500 text-orange-500"
                onClick={() => {
                  const item = cart.find(i => i.id === selectedItem.id);
                  if (item && item.quantity > 1) {
                    updateCartQuantity(selectedItem.id, -1);
                  }
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-bold">
                {cart.find(i => i.id === selectedItem.id)?.quantity || 1}
              </span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-full border-orange-500 text-orange-500"
                onClick={() => updateCartQuantity(selectedItem.id, 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-2xl font-bold text-orange-500">₹{selectedItem.price}</p>

          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">{selectedItem.description}</p>
            {selectedItem.calories && (
              <p className="text-sm text-orange-500 mt-2">(Each serving contains {selectedItem.calories} calories)</p>
            )}
          </div>

          {/* Recommended Sides */}
          <div>
            <h3 className="font-semibold mb-3">Recommended sides</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {menuItems.filter(i => i.category === 'Sides').slice(0, 4).map(side => (
                <Card key={side.id} className="min-w-[120px] p-2">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                    {side.image_url ? (
                      <img src={side.image_url} alt={side.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">🍴</div>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate">{side.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold">₹{side.price}</span>
                    <Button 
                      size="icon" 
                      variant="outline"
                      className="h-6 w-6 rounded-full"
                      onClick={() => addToCart(side)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Add to Cart */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-2xl">
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold">₹{selectedItem.price * (cart.find(i => i.id === selectedItem.id)?.quantity || 1)}</p>
          </div>
          <Button 
            className="gap-2 bg-orange-500 hover:bg-orange-600"
            onClick={() => {
              addToCart(selectedItem, cart.find(i => i.id === selectedItem.id)?.quantity || 1);
              setSelectedItem(null);
            }}
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
    );
  }

  // Menu View
  if (selectedRestaurant) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSelectedRestaurant(null)}>
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Button>
          <h2 className="text-xl font-bold">Our Menu</h2>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-orange-500">
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
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted">
                          {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm font-bold">₹{item.price * item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => updateCartQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => updateCartQuantity(item.id, 1)}>
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
                        <span>₹{selectedRestaurant.delivery_fee || 0}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>₹{cartTotal + (selectedRestaurant.delivery_fee || 0)}</span>
                      </div>
                    </div>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handlePlaceOrder}>
                      Place Order
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Categories */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full justify-start bg-transparent overflow-x-auto">
            {menuCategories.map(cat => (
              <TabsTrigger 
                key={cat} 
                value={cat}
                className={cn(
                  "data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none"
                )}
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Menu Grid */}
        {loadingMenu ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredMenu.map(item => (
              <Card 
                key={item.id} 
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                onClick={() => setSelectedItem(item)}
              >
                <div className="aspect-square relative bg-muted">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "absolute top-2 right-2 h-8 w-8 rounded-full bg-white shadow",
                      favorites.has(item.id) && "text-red-500"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                  >
                    <Heart className={cn("h-4 w-4", favorites.has(item.id) && "fill-current")} />
                  </Button>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold truncate">{item.name}</h3>
                  <p className="text-lg font-bold">₹{item.price}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <div className="flex justify-around max-w-md mx-auto">
            <Button variant="ghost" className="flex-col h-auto py-2">
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1">Home</span>
            </Button>
            <Button variant="ghost" className="flex-col h-auto py-2">
              <User className="h-5 w-5" />
              <span className="text-xs mt-1">Profile</span>
            </Button>
            <Button variant="ghost" className="flex-col h-auto py-2 text-orange-500">
              <Menu className="h-5 w-5" />
              <span className="text-xs mt-1">Menu</span>
            </Button>
            <Button variant="ghost" className="flex-col h-auto py-2">
              <Heart className="h-5 w-5" />
              <span className="text-xs mt-1">Favorites</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Restaurant List View (unchanged but with loading)
  return (
    <div className="space-y-6 pb-20">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search restaurants..."
          className="pl-12 h-14 rounded-2xl bg-muted/50"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {restaurants.map(restaurant => (
            <Card 
              key={restaurant.id} 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-all"
              onClick={() => {
                setSelectedRestaurant(restaurant);
                fetchMenu(restaurant.id);
              }}
            >
              <div className="h-40 relative bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30">
                {restaurant.image_url ? (
                  <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
                )}
                {restaurant.delivery_available && (
                  <Badge className="absolute top-3 right-3 bg-green-500">
                    {restaurant.delivery_time || '30-40 min'}
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg">{restaurant.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{restaurant.cuisine_type?.join(', ')}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {restaurant.rating_average}
                  </span>
                  <span className="text-muted-foreground">{restaurant.price_range}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {restaurant.city}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
