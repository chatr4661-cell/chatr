import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Plus, Minus, Camera, Pill, Check, Sparkles, ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MedicineHeroHeader } from '@/components/care/MedicineHeroHeader';
import { PricingCards } from '@/components/care/PricingCards';

interface CartItem {
  id: string;
  name: string;
  generic_name: string | null;
  strength: string | null;
  mrp: number;
  discounted_price: number | null;
  quantity: number;
  frequency: string;
  timing: string[];
}

const MedicineSubscribe = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('care');
  const [loading, setLoading] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const sampleMedicines = [
    { id: '1', name: 'Metformin 500mg', generic_name: 'Metformin', strength: '500mg', mrp: 120, discounted_price: 95, form: 'tablet' },
    { id: '2', name: 'Amlodipine 5mg', generic_name: 'Amlodipine', strength: '5mg', mrp: 85, discounted_price: 68, form: 'tablet' },
    { id: '3', name: 'Thyronorm 50mcg', generic_name: 'Levothyroxine', strength: '50mcg', mrp: 110, discounted_price: 88, form: 'tablet' },
    { id: '4', name: 'Atorvastatin 10mg', generic_name: 'Atorvastatin', strength: '10mg', mrp: 150, discounted_price: 120, form: 'tablet' },
    { id: '5', name: 'Telmisartan 40mg', generic_name: 'Telmisartan', strength: '40mg', mrp: 95, discounted_price: 76, form: 'tablet' },
    { id: '6', name: 'Glimepiride 2mg', generic_name: 'Glimepiride', strength: '2mg', mrp: 130, discounted_price: 104, form: 'tablet' },
  ];

  const filteredMedicines = sampleMedicines.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (medicine: typeof sampleMedicines[0]) => {
    const existing = cart.find(item => item.id === medicine.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === medicine.id 
          ? { ...item, quantity: item.quantity + 30 }
          : item
      ));
    } else {
      setCart([...cart, {
        ...medicine,
        quantity: 30,
        frequency: 'once_daily',
        timing: ['morning']
      }]);
    }
    toast.success(`Added ${medicine.name}`);
  };

  const updateCartItem = (id: string, updates: Partial<CartItem>) => {
    setCart(cart.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const mrpTotal = cart.reduce((sum, item) => sum + (item.mrp * (item.quantity / 30)), 0);
    const discountedTotal = cart.reduce((sum, item) => sum + ((item.discounted_price || item.mrp) * (item.quantity / 30)), 0);
    const savings = mrpTotal - discountedTotal;
    const planFee = selectedPlan === 'care' ? 99 : selectedPlan === 'family' ? 199 : 299;
    return { mrpTotal, discountedTotal, savings, planFee, total: discountedTotal + planFee };
  };

  const handleSubscribe = async () => {
    if (cart.length === 0) {
      toast.error('Please add medicines to your cart');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to subscribe');
        navigate('/auth');
        return;
      }

      const totals = calculateTotals();

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

      const items = cart.map(item => ({
        subscription_id: subscription.id,
        medicine_name: item.name,
        dosage: item.strength,
        frequency: item.frequency,
        timing: item.timing,
        quantity_per_month: item.quantity,
        unit_price: item.discounted_price || item.mrp,
        total_price: (item.discounted_price || item.mrp) * (item.quantity / 30),
        is_generic: item.generic_name !== null
      }));

      const { error: itemsError } = await supabase
        .from('subscription_items')
        .insert(items);

      if (itemsError) throw itemsError;

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
            reminder_type: 'push'
          });
        }
      }

      toast.success('Subscription created successfully!');
      navigate('/care/medicines/subscriptions');
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription');
    } finally {
      setLoading(false);
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
          <h2 className="text-base font-bold mb-3">Popular Medicines</h2>
          <div className="space-y-3">
            {filteredMedicines.map((medicine, idx) => {
              const inCart = cart.find(item => item.id === medicine.id);
              const savings = medicine.mrp - (medicine.discounted_price || medicine.mrp);
              const savingsPercent = Math.round((savings / medicine.mrp) * 100);

              return (
                <motion.div
                  key={medicine.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                >
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Pill className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{medicine.name}</h3>
                              {medicine.generic_name && (
                                <p className="text-xs text-muted-foreground">
                                  Generic: {medicine.generic_name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-xl font-bold">₹{medicine.discounted_price}</span>
                            <span className="text-sm text-muted-foreground line-through">₹{medicine.mrp}</span>
                            <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                              {savingsPercent}% off
                            </Badge>
                          </div>
                        </div>
                        <div>
                          {inCart ? (
                            <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => {
                                  if (inCart.quantity <= 30) {
                                    removeFromCart(medicine.id);
                                  } else {
                                    updateCartItem(medicine.id, { quantity: inCart.quantity - 30 });
                                  }
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">{inCart.quantity}</span>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => updateCartItem(medicine.id, { quantity: inCart.quantity + 30 })}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button 
                                size="sm" 
                                className="rounded-full shadow"
                                onClick={() => addToCart(medicine)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
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
      </div>

      {/* Cart Summary */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t shadow-2xl p-4"
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
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button 
                className="w-full h-12 text-base font-bold shadow-lg" 
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? (
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MedicineSubscribe;
