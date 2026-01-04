import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pause, Play, Trash2, Package, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

      // Load items for each subscription
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

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'care': return <Badge className="bg-primary">Care</Badge>;
      case 'family': return <Badge className="bg-blue-500">Family</Badge>;
      case 'care_plus': return <Badge className="bg-purple-500">Care+</Badge>;
      default: return <Badge variant="secondary">{plan}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="outline" className="border-green-500 text-green-600">Active</Badge>;
      case 'paused': return <Badge variant="outline" className="border-amber-500 text-amber-600">Paused</Badge>;
      case 'cancelled': return <Badge variant="outline" className="border-red-500 text-red-600">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">My Subscriptions</h1>
              <p className="text-sm text-muted-foreground">{subscriptions.length} active plans</p>
            </div>
          </div>
          <Button onClick={() => navigate('/care/medicines/subscribe')}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {subscriptions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Subscriptions Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start your medicine subscription to save 20-25% on monthly medicines
              </p>
              <Button onClick={() => navigate('/care/medicines/subscribe')}>
                <Plus className="h-4 w-4 mr-1" />
                Subscribe Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          subscriptions.map((sub) => (
            <Card key={sub.id} className={sub.status === 'cancelled' ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getPlanBadge(sub.plan_type)}
                      {getStatusBadge(sub.status)}
                    </div>
                    <h3 className="font-semibold">{sub.subscription_name}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">₹{sub.monthly_cost}</p>
                    <p className="text-xs text-green-600">Save ₹{sub.savings_amount}/mo</p>
                  </div>
                </div>

                {sub.next_delivery_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Calendar className="h-4 w-4" />
                    <span>Next delivery: {format(new Date(sub.next_delivery_date), 'dd MMM yyyy')}</span>
                  </div>
                )}

                {/* Medicines in subscription */}
                <div 
                  className="cursor-pointer"
                  onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                >
                  <div className="flex items-center justify-between py-2 border-t">
                    <span className="text-sm font-medium">
                      {items[sub.id]?.length || 0} Medicines
                    </span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${expandedSub === sub.id ? 'rotate-90' : ''}`} />
                  </div>
                  
                  {expandedSub === sub.id && items[sub.id] && (
                    <div className="space-y-2 pt-2">
                      {items[sub.id].map((item) => (
                        <div key={item.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                          <div>
                            <p className="font-medium">{item.medicine_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.frequency?.replace('_', ' ')} • {item.quantity_per_month} units/mo
                            </p>
                          </div>
                          <span className="font-medium">₹{item.total_price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {sub.status !== 'cancelled' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
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
                      className="text-destructive hover:text-destructive"
                      onClick={() => cancelSubscription(sub.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MedicineSubscriptions;
