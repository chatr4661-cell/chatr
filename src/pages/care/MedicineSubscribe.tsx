import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Minus, Camera, Pill, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [showScanner, setShowScanner] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('care');
  const [loading, setLoading] = useState(false);

  // Sample medicines (in production, fetch from medicine_catalog)
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
    toast.success(`Added ${medicine.name} to cart`);
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

      // Add subscription items
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

      // Create reminders for each medicine
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

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Subscribe to Medicines</h1>
            <p className="text-sm text-muted-foreground">Save 20-25% on monthly medicines</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Scan Prescription CTA */}
        <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Scan Prescription
                </h3>
                <p className="text-sm opacity-90">AI will auto-detect medicines</p>
              </div>
              <Button 
                onClick={() => navigate('/care/medicines/prescriptions')}
                className="bg-white text-purple-600 hover:bg-white/90"
              >
                <Camera className="h-4 w-4 mr-1" />
                Scan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Medicine List */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Popular Medicines</h2>
          <div className="space-y-3">
            {filteredMedicines.map((medicine) => {
              const inCart = cart.find(item => item.id === medicine.id);
              const savings = medicine.mrp - (medicine.discounted_price || medicine.mrp);
              const savingsPercent = Math.round((savings / medicine.mrp) * 100);

              return (
                <Card key={medicine.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Pill className="h-4 w-4 text-primary" />
                          <h3 className="font-medium">{medicine.name}</h3>
                        </div>
                        {medicine.generic_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Generic: {medicine.generic_name}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-lg font-bold">₹{medicine.discounted_price}</span>
                          <span className="text-sm text-muted-foreground line-through">₹{medicine.mrp}</span>
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            {savingsPercent}% off
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">per strip of 10</p>
                      </div>
                      <div>
                        {inCart ? (
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartItem(medicine.id, { quantity: Math.max(30, inCart.quantity - 30) })}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{inCart.quantity}</span>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartItem(medicine.id, { quantity: inCart.quantity + 30 })}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => addToCart(medicine)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Plan Selection */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Select Plan</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'care', name: 'Care', price: 99, desc: 'Individual' },
              { id: 'family', name: 'Family', price: 199, desc: '4 members' },
              { id: 'care_plus', name: 'Care+', price: 299, desc: '+ Consults' },
            ].map((plan) => (
              <Card 
                key={plan.id}
                className={`cursor-pointer transition-all ${selectedPlan === plan.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <CardContent className="p-3 text-center">
                  {selectedPlan === plan.id && (
                    <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                  )}
                  <p className="font-bold">{plan.name}</p>
                  <p className="text-lg font-bold text-primary">₹{plan.price}</p>
                  <p className="text-xs text-muted-foreground">{plan.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Summary Fixed Bottom */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Medicine Total (MRP)</span>
              <span className="line-through text-muted-foreground">₹{totals.mrpTotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discounted Price</span>
              <span>₹{totals.discountedTotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan Fee</span>
              <span>₹{totals.planFee}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Your Savings</span>
              <span>₹{totals.savings.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Monthly Total</span>
              <span>₹{totals.total.toFixed(0)}</span>
            </div>
          </div>
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? 'Creating Subscription...' : `Subscribe - ₹${totals.total.toFixed(0)}/month`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MedicineSubscribe;
