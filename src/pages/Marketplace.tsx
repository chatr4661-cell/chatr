import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  ArrowLeft, ShoppingBag, Search, Plus, Minus, Trash2, 
  Star, Clock, MapPin, Truck, Heart, Filter, ChevronRight,
  Pill, Apple, Droplet, Leaf, ShoppingCart, Package
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { CrossModuleNav } from '@/components/navigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  image_url?: string;
  category: string;
  rating: number;
  reviews: number;
  in_stock: boolean;
  delivery_time: string;
  vendor_name: string;
  is_prescription?: boolean;
  discount_percent?: number;
}

interface CartItem extends Product {
  quantity: number;
}

const categories = [
  { id: 'all', name: 'All', icon: Package, color: 'from-gray-500 to-gray-600' },
  { id: 'medicines', name: 'Medicines', icon: Pill, color: 'from-red-500 to-pink-500' },
  { id: 'wellness', name: 'Wellness', icon: Heart, color: 'from-pink-500 to-rose-500' },
  { id: 'nutrition', name: 'Nutrition', icon: Apple, color: 'from-green-500 to-emerald-500' },
  { id: 'personal-care', name: 'Personal Care', icon: Droplet, color: 'from-blue-500 to-cyan-500' },
  { id: 'ayurveda', name: 'Ayurveda', icon: Leaf, color: 'from-amber-500 to-yellow-500' },
];

// Sample products (will be replaced with DB data)
const sampleProducts: Product[] = [
  { id: '1', name: 'Paracetamol 500mg', description: 'Pain relief tablets - Strip of 10', price: 25, original_price: 35, category: 'medicines', rating: 4.8, reviews: 2340, in_stock: true, delivery_time: '30 min', vendor_name: 'MedPlus', is_prescription: false, discount_percent: 29, image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200' },
  { id: '2', name: 'Vitamin D3 Tablets', description: '60 tablets - Bone Health', price: 299, original_price: 450, category: 'wellness', rating: 4.6, reviews: 1890, in_stock: true, delivery_time: '2 hrs', vendor_name: 'Apollo Pharmacy', discount_percent: 34, image_url: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=200' },
  { id: '3', name: 'Protein Powder 1kg', description: 'Whey Protein - Chocolate Flavor', price: 1499, original_price: 2499, category: 'nutrition', rating: 4.5, reviews: 3450, in_stock: true, delivery_time: '1 day', vendor_name: 'HealthKart', discount_percent: 40, image_url: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=200' },
  { id: '4', name: 'Hand Sanitizer 500ml', description: 'Alcohol-based antibacterial gel', price: 149, original_price: 199, category: 'personal-care', rating: 4.7, reviews: 5670, in_stock: true, delivery_time: '1 hr', vendor_name: 'Dettol Store', discount_percent: 25, image_url: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=200' },
  { id: '5', name: 'Chyawanprash 1kg', description: 'Immunity booster - Ayurvedic', price: 399, original_price: 499, category: 'ayurveda', rating: 4.9, reviews: 890, in_stock: true, delivery_time: '1 day', vendor_name: 'Dabur', discount_percent: 20, image_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200' },
  { id: '6', name: 'Multivitamin Tablets', description: 'Daily nutrition - 30 tablets', price: 349, original_price: 499, category: 'wellness', rating: 4.4, reviews: 2100, in_stock: true, delivery_time: '2 hrs', vendor_name: 'Himalaya', discount_percent: 30, image_url: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=200' },
  { id: '7', name: 'Face Wash 150ml', description: 'Gentle cleansing - All skin types', price: 199, original_price: 250, category: 'personal-care', rating: 4.3, reviews: 4560, in_stock: true, delivery_time: '1 hr', vendor_name: 'Cetaphil', discount_percent: 20, image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200' },
  { id: '8', name: 'Omega-3 Fish Oil', description: 'Heart health - 60 softgels', price: 549, original_price: 799, category: 'nutrition', rating: 4.7, reviews: 1230, in_stock: true, delivery_time: '1 day', vendor_name: 'Healthvit', discount_percent: 31, image_url: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=200' },
];

const Marketplace = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    // Load saved cart from localStorage
    const savedCart = localStorage.getItem('chatr-marketplace-cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    // Save cart to localStorage
    localStorage.setItem('chatr-marketplace-cart', JSON.stringify(cart));
  }, [cart]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`Added ${product.name} to cart`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to checkout');
      navigate('/auth');
      return;
    }

    // Store cart in session for checkout page
    sessionStorage.setItem('marketplace-checkout', JSON.stringify({
      items: cart,
      total: cartTotal
    }));
    
    navigate('/marketplace/checkout');
  };

  return (
    <>
      <SEOHead
        title="Marketplace - Medicines & Health Products | Chatr"
        description="Shop for medicines, health products, and wellness items. Fast delivery and quality products with up to 40% off."
        keywords="marketplace, medicines, health products, online pharmacy, wellness, vitamins"
        breadcrumbList={[
          { name: 'Home', url: '/' },
          { name: 'Marketplace', url: '/marketplace' }
        ]}
      />
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-bold">Health Marketplace</h1>
                <p className="text-xs text-muted-foreground">Medicines & Wellness</p>
              </div>
              
              {/* Cart Button */}
              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                        {cartItemCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Your Cart ({cartItemCount})</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col h-full">
                    <ScrollArea className="flex-1 py-4">
                      {cart.length === 0 ? (
                        <div className="text-center py-12">
                          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                          <p className="text-muted-foreground">Your cart is empty</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {cart.map((item) => (
                            <Card key={item.id} className="p-3">
                              <div className="flex gap-3">
                                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="h-6 w-6 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                                  <p className="text-sm font-bold text-primary">₹{item.price}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => updateQuantity(item.id, -1)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => updateQuantity(item.id, 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 ml-auto text-destructive"
                                      onClick={() => removeFromCart(item.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    
                    {cart.length > 0 && (
                      <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span>₹{cartTotal.toFixed(2)}</span>
                        </div>
                        <Button className="w-full" size="lg" onClick={handleCheckout}>
                          Proceed to Checkout
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search medicines, wellness products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-muted/50 border-0 text-base"
            />
          </div>

          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-red-500">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800')] opacity-20 bg-cover bg-center" />
            <div className="relative p-5">
              <Badge className="bg-white/20 text-white border-0 mb-2">🏥 Health Store</Badge>
              <h2 className="text-xl font-bold text-white mb-1">Up to 40% OFF on Medicines</h2>
              <p className="text-white/80 text-sm mb-3">Free delivery on orders above ₹499</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/90 text-purple-600">
                  <Truck className="w-3 h-3 mr-1" /> Fast Delivery
                </Badge>
                <Badge variant="secondary" className="bg-white/90 text-green-600">
                  <Star className="w-3 h-3 mr-1" /> Genuine Products
                </Badge>
              </div>
            </div>
          </div>

          {/* Categories */}
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex flex-col items-center gap-2 shrink-0 p-3 rounded-xl transition-all min-w-[80px] ${
                      selectedCategory === cat.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-xs font-medium ${selectedCategory === cat.id ? 'text-primary' : ''}`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Products Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">{filteredProducts.length} Products</h2>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="overflow-hidden group hover:shadow-lg transition-all">
                      <div className="relative aspect-square bg-muted">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                        {product.discount_percent && (
                          <Badge className="absolute top-2 left-2 bg-green-600 text-white text-[10px]">
                            {product.discount_percent}% OFF
                          </Badge>
                        )}
                        {product.is_prescription && (
                          <Badge variant="destructive" className="absolute top-2 right-2 text-[10px]">
                            Rx
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm line-clamp-2 mb-1">{product.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{product.description}</p>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-primary">₹{product.price}</span>
                          {product.original_price && (
                            <span className="text-xs text-muted-foreground line-through">₹{product.original_price}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {product.rating}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Truck className="w-3 h-3" />
                            {product.delivery_time}
                          </span>
                        </div>

                        <Button 
                          className="w-full h-8 text-xs"
                          onClick={() => addToCart(product)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Floating Cart Button (Mobile) */}
        {cartItemCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-20 left-4 right-4 z-40"
          >
            <Button 
              className="w-full h-14 rounded-full shadow-lg bg-primary"
              onClick={() => setCartOpen(true)}
            >
              <div className="flex items-center justify-between w-full px-2">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount} items
                </span>
                <span className="font-bold">₹{cartTotal.toFixed(2)} →</span>
              </div>
            </Button>
          </motion.div>
        )}

        <CrossModuleNav variant="footer" />
      </div>
    </>
  );
};

export default Marketplace;