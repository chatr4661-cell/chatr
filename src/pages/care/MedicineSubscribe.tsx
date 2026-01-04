import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Camera, Sparkles, ShoppingCart, MapPin, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MedicineHeroHeader } from '@/components/care/MedicineHeroHeader';
import { MedicineSearchCard } from '@/components/care/MedicineSearchCard';
import { PricingCards } from '@/components/care/PricingCards';
import { AddressForm, DeliveryAddress } from '@/components/care/AddressForm';
import { MedicineBottomNav } from '@/components/care/MedicineBottomNav';

interface Medicine {
  id: string;
  name: string;
  generic_name: string | null;
  manufacturer: string | null;
  category: string | null;
  form: string | null;
  strength: string | null;
  pack_size: number | null;
  mrp: number;
  discounted_price: number | null;
  requires_prescription: boolean;
}

interface CartItem extends Medicine {
  quantity: number;
  frequency: string;
  timing: string[];
}

const MedicineSubscribe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('care');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savedAddress, setSavedAddress] = useState<DeliveryAddress | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = ['all', 'Diabetes', 'Hypertension', 'Thyroid', 'Cholesterol', 'Supplements'];

  useEffect(() => {
    loadMedicines();
    loadSavedAddress();
  }, []);

  const loadMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from('medicine_catalog')
        .select('*')
        .eq('is_available', true)
        .order('name');

      if (error) throw error;
      setMedicines(data || []);
    } catch (error) {
      console.error('Error loading medicines:', error);
      toast.error('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedAddress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('delivery_address')
        .eq('id', user.id)
        .single();

      if (profile?.delivery_address) {
        setSavedAddress(profile.delivery_address as unknown as DeliveryAddress);
      }
    } catch (error) {
      console.error('Error loading address:', error);
    }
  };

  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = searchQuery === '' || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.generic_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  const addToCart = (medicine: Medicine) => {
    const existing = cart.find(item => item.id === medicine.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === medicine.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        ...medicine,
        quantity: 1,
        frequency: 'once_daily',
        timing: ['morning']
      }]);
    }
    toast.success(`Added ${medicine.name}`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const mrpTotal = cart.reduce((sum, item) => sum + (item.mrp * item.quantity), 0);
    const discountedTotal = cart.reduce((sum, item) => 
      sum + ((item.discounted_price || item.mrp) * item.quantity), 0);
    const savings = mrpTotal - discountedTotal;
    const planFee = selectedPlan === 'care' ? 99 : selectedPlan === 'family' ? 199 : 299;
    return { mrpTotal, discountedTotal, savings, planFee, total: discountedTotal + planFee };
  };

  const handleAddressSubmit = async (address: DeliveryAddress) => {
    setSavedAddress(address);
    setShowAddressForm(false);
    
    // Save to profile
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ delivery_address: address as any })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error saving address:', error);
    }
  };

  const handleSubscribe = async () => {
    if (cart.length === 0) {
      toast.error('Please add medicines to your cart');
      return;
    }

    if (!savedAddress) {
      setShowAddressForm(true);
      toast.error('Please add delivery address');
      return;
    }

    setSubscribing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to subscribe');
        navigate('/auth');
        return;
      }

      const totals = calculateTotals();

      // Create subscription
      const { data: subscription, error: subError } = await supabase
        .from('medicine_subscriptions')
        .insert({
          user_id: user.id,
          subscription_name: 'My Medicine Plan',
          plan_type: selectedPlan,
          monthly_cost: totals.total,
          savings_amount: totals.savings,
          next_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active'
        })
        .select()
        .single();

      if (subError) throw subError;

      // Create subscription items
      const items = cart.map(item => ({
        subscription_id: subscription.id,
        medicine_name: item.name,
        dosage: item.strength,
        frequency: item.frequency,
        timing: item.timing,
        quantity_per_month: item.quantity * (item.pack_size || 30),
        unit_price: item.discounted_price || item.mrp,
        total_price: (item.discounted_price || item.mrp) * item.quantity,
        is_generic: item.generic_name !== null
      }));

      const { error: itemsError } = await supabase
        .from('subscription_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Create first order
      const { error: orderError } = await supabase
        .from('medicine_orders')
        .insert({
          user_id: user.id,
          subscription_id: subscription.id,
          order_number: `ORD${Date.now().toString(36).toUpperCase()}`,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.discounted_price || item.mrp
          })),
          subtotal: totals.discountedTotal,
          discount: totals.savings,
          delivery_fee: 0,
          total: totals.total,
          status: 'pending',
          delivery_address: savedAddress as any,
          expected_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          payment_status: 'pending'
        });

      if (orderError) throw orderError;

      // Create reminders
      for (const item of cart) {
        const times = item.timing.map(t => {
          switch(t) {
            case 'morning': return '08:00';
            case 'afternoon': return '14:00';
            case 'evening': return '19:00';
            case 'night': return '22:00';
            default: return '08:00';
          }
        });

        for (const time of times) {
          await supabase.from('medicine_reminders').insert({
            user_id: user.id,
            medicine_name: item.name,
            scheduled_time: time,
            reminder_type: 'push',
            is_active: true
          });
        }
      }

      toast.success('Subscription created successfully!');
      navigate('/care/medicines/subscriptions');
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription');
    } finally {
      setSubscribing(false);
    }
  };

  const totals = calculateTotals();

  const pricingPlans = [
    { id: 'care', name: 'Care', price: 99, description: 'Individual', features: ['1 user', 'Auto-delivery', 'Reminders'], badge: 'Popular', popular: true, gradient: 'from-primary to-primary/70' },
    { id: 'family', name: 'Family', price: 199, description: '4 members', features: ['4 users', 'Family alerts', 'Dashboard'], gradient: 'from-blue-500 to-cyan-500' },
    { id: 'care_plus', name: 'Care+', price: 299, description: '+ Consults', features: ['Unlimited', '2 consults/mo', '24/7 support'], badge: 'Premium', gradient: 'from-purple-500 to-pink-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-48">
      <MedicineHeroHeader
        title="Subscribe to Medicines"
        subtitle="Save 20-25% with monthly delivery"
        gradient="health"
      />

      <div className="p-4 space-y-5">
        {/* Search */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-2xl border-0 bg-muted/50 shadow-sm"
          />
        </motion.div>

        {/* Category Tabs */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                size="sm"
                className="rounded-full whitespace-nowrap"
                onClick={() => setActiveCategory(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </Button>
            ))}
          </div>
        </div>

        {/* AI Scan CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="relative bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-5">
              <div className="absolute inset-0 opacity-20">
                <motion.div
                  className="absolute w-32 h-32 rounded-full bg-white/30 -top-16 -right-16"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-white">AI Prescription Scanner</h3>
                    <p className="text-sm text-white/80">Auto-detect medicines instantly</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/care/medicines/prescriptions')}
                  className="bg-white text-purple-600 hover:bg-white/90 shadow-lg"
                >
                  <Camera className="h-4 w-4 mr-1.5" />
                  Scan
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Medicine List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">
              {activeCategory === 'all' ? 'All Medicines' : activeCategory}
              <span className="text-muted-foreground font-normal ml-2">({filteredMedicines.length})</span>
            </h2>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No medicines found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMedicines.map((medicine, idx) => {
                const cartItem = cart.find(item => item.id === medicine.id);
                return (
                  <MedicineSearchCard
                    key={medicine.id}
                    medicine={medicine}
                    inCart={!!cartItem}
                    cartQuantity={cartItem?.quantity || 0}
                    onAdd={() => addToCart(medicine)}
                    onIncrement={() => updateQuantity(medicine.id, 1)}
                    onDecrement={() => updateQuantity(medicine.id, -1)}
                    delay={idx * 0.03}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Plan Selection */}
        <div>
          <h2 className="text-base font-bold mb-3">Select Plan</h2>
          <PricingCards 
            plans={pricingPlans}
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
          />
        </div>

        {/* Delivery Address */}
        {savedAddress && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Deliver to: {savedAddress.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {savedAddress.addressLine1}, {savedAddress.city} - {savedAddress.pincode}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAddressForm(true)}>
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Address Form Sheet */}
      <Sheet open={showAddressForm} onOpenChange={setShowAddressForm}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Delivery Address</SheetTitle>
          </SheetHeader>
          <AddressForm 
            onSubmit={handleAddressSubmit}
            initialAddress={savedAddress || undefined}
          />
        </SheetContent>
      </Sheet>

      {/* Cart Summary */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-xl border-t shadow-2xl p-4 z-40"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
          >
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Medicines ({cart.length} items)</span>
                <span className="line-through text-muted-foreground">₹{totals.mrpTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discounted Price</span>
                <span>₹{totals.discountedTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{pricingPlans.find(p => p.id === selectedPlan)?.name} Plan</span>
                <span>₹{totals.planFee}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Your Savings</span>
                <span>₹{totals.savings.toFixed(0)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Monthly Total</span>
                <span>₹{totals.total.toFixed(0)}</span>
              </div>
            </div>
            
            {!savedAddress ? (
              <Button 
                className="w-full h-12 text-base font-bold"
                onClick={() => setShowAddressForm(true)}
              >
                <MapPin className="h-5 w-5 mr-2" />
                Add Delivery Address
              </Button>
            ) : (
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button 
                  className="w-full h-12 text-base font-bold shadow-lg" 
                  onClick={handleSubscribe}
                  disabled={subscribing}
                >
                  {subscribing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Subscribe - ₹{totals.total.toFixed(0)}/month
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <MedicineBottomNav />
    </div>
  );
};

export default MedicineSubscribe;
