import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Clock, MapPin, Plus, Minus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  category_name?: string;
  image_url: string | null;
  is_available: boolean | null;
  is_veg: boolean | null;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export default function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRestaurantData();
    loadCart();
  }, [id]);

  const loadRestaurantData = async () => {
    try {
      const { data: restaurantData } = await supabase
        .from('food_vendors')
        .select('*')
        .eq('id', id)
        .single();

      if (restaurantData) {
        setRestaurant(restaurantData);
      }

      // Load menu items with category names
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*, menu_categories(name)')
        .eq('vendor_id', id)
        .eq('is_available', true);

      if (menuData) {
        const mappedItems: MenuItem[] = menuData.map((item: any) => ({
          ...item,
          category_name: item.menu_categories?.name || 'Uncategorized'
        }));
        setMenuItems(mappedItems);
        const uniqueCategories = [...new Set(mappedItems.map(item => item.category_name || 'Uncategorized'))];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem(`food_cart_${id}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCart = (newCart: CartItem[]) => {
    localStorage.setItem(`food_cart_${id}`, JSON.stringify(newCart));
    setCart(newCart);
  };

  const addToCart = (item: MenuItem) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      saveCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      saveCart([...cart, { ...item, quantity: 1 }]);
    }
    toast({ title: "Added to cart", description: item.name });
  };

  const removeFromCart = (itemId: string) => {
    const existing = cart.find(c => c.id === itemId);
    if (existing && existing.quantity > 1) {
      saveCart(cart.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c));
    } else {
      saveCart(cart.filter(c => c.id !== itemId));
    }
  };

  const getItemQuantity = (itemId: string) => {
    return cart.find(c => c.id === itemId)?.quantity || 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative h-48 bg-gradient-to-br from-orange-500 to-red-600">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/20 backdrop-blur-sm text-white"
          onClick={() => navigate('/food-ordering')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="text-2xl font-bold">{restaurant?.restaurant_name || 'Restaurant'}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm opacity-90">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {restaurant?.rating || 4.5}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {restaurant?.delivery_time || '30-40'} min
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {restaurant?.address?.slice(0, 20) || 'Location'}...
            </span>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="p-4">
        {categories.length > 0 ? (
          <Tabs defaultValue={categories[0]} className="w-full">
            <TabsList className="w-full overflow-x-auto flex justify-start gap-1 bg-muted/50 p-1">
              {categories.map(category => (
                <TabsTrigger key={category} value={category} className="whitespace-nowrap">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map(category => (
              <TabsContent key={category} value={category} className="mt-4 space-y-3">
                {menuItems
                  .filter(item => item.category_name === category)
                  .map(item => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-3 flex gap-3">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-sm border-2 ${item.is_veg ? 'border-green-500' : 'border-red-500'}`}>
                                  <span className={`block w-1.5 h-1.5 m-0.5 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                                </span>
                                <h3 className="font-medium text-sm">{item.name}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {item.description}
                              </p>
                              <p className="font-semibold text-sm mt-1">₹{item.price}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center">
                          {getItemQuantity(item.id) > 0 ? (
                            <div className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-2 py-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
                                onClick={() => removeFromCart(item.id)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-4 text-center">
                                {getItemQuantity(item.id)}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
                                onClick={() => addToCart(item)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => addToCart(item)}
                              className="bg-primary hover:bg-primary/90"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No menu items available</p>
          </div>
        )}
      </div>

      {/* Cart Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-bottom">
          <Button
            className="w-full h-14 text-lg"
            onClick={() => navigate(`/food-checkout/${id}`)}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {cartItemCount} items • ₹{cartTotal}
            <span className="ml-auto">View Cart →</span>
          </Button>
        </div>
      )}
    </div>
  );
}
