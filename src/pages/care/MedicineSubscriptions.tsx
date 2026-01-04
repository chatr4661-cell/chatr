import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pause, Play, Trash2, Package, Calendar, ChevronDown, ChevronUp, Sparkles, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MedicineBottomNav } from '@/components/care/MedicineBottomNav';
import { MedicineHeroHeader } from '@/components/care/MedicineHeroHeader';

interface Subscription {
  id: string;
  subscription_name: string;
  plan_type: string;
  status: string;
  monthly_cost: number;
  savings_amount: number;
  next_delivery_date: string | null;
  created_at: string;
}

interface SubscriptionItem {
  id: string;
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  quantity_per_month: number | null;
  total_price: number | null;
}

const MedicineSubscriptions = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [items, setItems] = useState<Record<string, SubscriptionItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('medicine_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);

      for (const sub of data || []) {
        const { data: itemsData } = await supabase
          .from('subscription_items')
          .select('*')
          .eq('subscription_id', sub.id);
        
        if (itemsData) {
          setItems(prev => ({ ...prev, [sub.id]: itemsData }));
        }
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (subId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase
        .from('medicine_subscriptions')
        .update({ status: newStatus })
        .eq('id', subId);

      if (error) throw error;
      
      setSubscriptions(subs => subs.map(s => 
        s.id === subId ? { ...s, status: newStatus } : s
      ));
      toast.success(`Subscription ${newStatus === 'active' ? 'resumed' : 'paused'}`);
    } catch (error) {
      toast.error('Failed to update subscription');
    }
  };

  const cancelSubscription = async (subId: string) => {
    try {
      const { error } = await supabase
        .from('medicine_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subId);

      if (error) throw error;
      
      setSubscriptions(subs => subs.map(s => 
        s.id === subId ? { ...s, status: 'cancelled' } : s
      ));
      toast.success('Subscription cancelled');
    } catch (error) {
      toast.error('Failed to cancel subscription');
    }
  };

  const getPlanConfig = (plan: string) => {
    switch (plan) {
      case 'care': return { gradient: 'from-primary to-primary/70', name: 'Care' };
      case 'family': return { gradient: 'from-blue-500 to-indigo-600', name: 'Family' };
      case 'care_plus': return { gradient: 'from-purple-500 to-pink-500', name: 'Care+' };
      default: return { gradient: 'from-gray-500 to-gray-600', name: plan };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { color: 'bg-green-500', text: 'Active' };
      case 'paused': return { color: 'bg-amber-500', text: 'Paused' };
      case 'cancelled': return { color: 'bg-red-500', text: 'Cancelled' };
      default: return { color: 'bg-gray-500', text: status };
    }
  };

  const activeCount = subscriptions.filter(s => s.status === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24">
      <MedicineHeroHeader
        title="My Subscriptions"
        subtitle={`${activeCount} active plan${activeCount !== 1 ? 's' : ''}`}
        gradient="primary"
        rightAction={
          <Button 
            onClick={() => navigate('/care/medicines/subscribe')} 
            size="sm"
            className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-6 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <motion.div 
                  className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Package className="h-10 w-10 text-primary" />
                </motion.div>
                <h3 className="text-lg font-bold mb-2">No Subscriptions Yet</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Start your medicine subscription to save 20-25% on monthly medicines
                </p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={() => navigate('/care/medicines/subscribe')} size="lg">
                    <Plus className="h-5 w-5 mr-2" />
                    Subscribe Now
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub, idx) => {
              const planConfig = getPlanConfig(sub.plan_type);
              const statusConfig = getStatusConfig(sub.status);
              const isExpanded = expandedSub === sub.id;
              const subItems = items[sub.id] || [];

              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`border-0 shadow-lg overflow-hidden ${sub.status === 'cancelled' ? 'opacity-60' : ''}`}>
                    {/* Plan Header Strip */}
                    <div className={`h-1.5 bg-gradient-to-r ${planConfig.gradient}`} />
                    
                    <CardContent className="p-4">
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`bg-gradient-to-r ${planConfig.gradient} text-white border-0`}>
                              {planConfig.name}
                            </Badge>
                            <Badge className={`${statusConfig.color} text-white border-0`}>
                              {statusConfig.text}
                            </Badge>
                          </div>
                          <h3 className="font-bold text-lg">{sub.subscription_name}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">₹{sub.monthly_cost}</p>
                          <p className="text-xs text-green-600 font-medium">Save ₹{sub.savings_amount}/mo</p>
                        </div>
                      </div>

                      {/* Delivery Info */}
                      {sub.next_delivery_date && (
                        <motion.div 
                          className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2 mb-3"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>Next delivery: <span className="font-medium">{format(new Date(sub.next_delivery_date), 'dd MMM yyyy')}</span></span>
                        </motion.div>
                      )}

                      {/* Medicines Accordion */}
                      <div 
                        className="cursor-pointer"
                        onClick={() => setExpandedSub(isExpanded ? null : sub.id)}
                      >
                        <div className="flex items-center justify-between py-2 border-t">
                          <span className="text-sm font-semibold">
                            {subItems.length} Medicine{subItems.length !== 1 ? 's' : ''}
                          </span>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="space-y-2 pt-2 overflow-hidden"
                            >
                              {subItems.map((item, i) => (
                                <motion.div 
                                  key={item.id} 
                                  className="flex justify-between items-center p-3 bg-muted/50 rounded-xl"
                                  initial={{ x: -10, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ delay: i * 0.05 }}
                                >
                                  <div>
                                    <p className="font-medium text-sm">{item.medicine_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.frequency?.replace('_', ' ')} • {item.quantity_per_month} units/mo
                                    </p>
                                  </div>
                                  <span className="font-semibold">₹{item.total_price}</span>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Actions */}
                      {sub.status !== 'cancelled' && (
                        <div className="flex gap-2 mt-4 pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 rounded-full"
                            onClick={() => toggleStatus(sub.id, sub.status)}
                          >
                            {sub.status === 'active' ? (
                              <>
                                <Pause className="h-4 w-4 mr-1" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Resume
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => cancelSubscription(sub.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      
      <MedicineBottomNav />
    </div>
  );
};

export default MedicineSubscriptions;
